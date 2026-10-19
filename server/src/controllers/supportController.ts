import { NextFunction, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth';
import { StudentRegistration } from '../models/StudentRegistration';
import { SupportMessage } from '../models/SupportMessage';
import { logAudit } from '../services/auditService';

const MessageSchema = z.object({ message: z.string().trim().min(1).max(2000) });

export const getMySupportMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required.' }); return; }
    await SupportMessage.updateMany({ userId: req.user._id, senderRole: 'admin', readByUser: false }, { $set: { readByUser: true } });
    const messages = await SupportMessage.find({ userId: req.user._id }).sort({ createdAt: 1 }).limit(300).lean();
    res.status(200).json({ success: true, messages });
  } catch (error) { next(error); }
};

export const sendSupportMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required.' }); return; }
    const parsed = MessageSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, message: 'Enter a message up to 2,000 characters.' }); return; }
    const message = await SupportMessage.create({ userId: req.user._id, senderId: req.user._id, senderRole: 'user', message: parsed.data.message, readByUser: true, readByAdmin: false });
    res.status(201).json({ success: true, message });
  } catch (error) { next(error); }
};

export const getSupportConversationsAdmin = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messages = await SupportMessage.find().sort({ createdAt: -1 }).limit(3000).lean();
    const grouped = new Map<string, { lastMessage: any; unreadCount: number }>();
    for (const message of messages) {
      const userId = message.userId.toString();
      const existing = grouped.get(userId);
      if (!existing) grouped.set(userId, { lastMessage: message, unreadCount: message.senderRole === 'user' && !message.readByAdmin ? 1 : 0 });
      else if (message.senderRole === 'user' && !message.readByAdmin) existing.unreadCount += 1;
    }
    const ids = [...grouped.keys()].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
    const users = await StudentRegistration.find({ _id: { $in: ids } }).select('_id name googleEmail').lean();
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const conversations = [...grouped.entries()].map(([userId, data]) => ({ user: userMap.get(userId), lastMessage: data.lastMessage, unreadCount: data.unreadCount }))
      .filter((conversation) => conversation.user)
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
    res.status(200).json({ success: true, conversations });
  } catch (error) { next(error); }
};

export const getSupportConversationAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId;
    if (!Types.ObjectId.isValid(userId)) { res.status(400).json({ success: false, message: 'Invalid account.' }); return; }
    await SupportMessage.updateMany({ userId, senderRole: 'user', readByAdmin: false }, { $set: { readByAdmin: true } });
    const messages = await SupportMessage.find({ userId }).sort({ createdAt: 1 }).limit(300).lean();
    res.status(200).json({ success: true, messages });
  } catch (error) { next(error); }
};

export const sendSupportReplyAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: 'Authentication required.' }); return; }
    const userId = req.params.userId;
    if (!Types.ObjectId.isValid(userId)) { res.status(400).json({ success: false, message: 'Invalid account.' }); return; }
    const parsed = MessageSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, message: 'Enter a reply up to 2,000 characters.' }); return; }
    const recipient = await StudentRegistration.findById(userId).select('_id');
    if (!recipient) { res.status(404).json({ success: false, message: 'User account not found.' }); return; }
    const message = await SupportMessage.create({ userId, senderId: req.user._id, senderRole: 'admin', message: parsed.data.message, readByAdmin: true, readByUser: false });
    res.status(201).json({ success: true, message });
  } catch (error) { next(error); }
};

export const deleteSupportConversationAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.params.userId;
    if (!Types.ObjectId.isValid(userId)) { res.status(400).json({ success: false, message: 'Invalid account.' }); return; }
    const messageCount = await SupportMessage.countDocuments({ userId });
    if (!messageCount) { res.status(404).json({ success: false, message: 'Support conversation not found.' }); return; }
    await logAudit({ actorId: req.user?._id, actorEmail: req.user?.googleEmail || '', actorRole: 'admin', action: 'ADMIN_DELETED_SUPPORT_CONVERSATION', targetEntity: 'SupportMessage', targetId: userId, details: { userId, messageCount }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    const result = await SupportMessage.deleteMany({ userId });
    res.status(200).json({ success: true, deletedCount: result.deletedCount || 0, message: 'Support conversation deleted.' });
  } catch (error) { next(error); }
};
