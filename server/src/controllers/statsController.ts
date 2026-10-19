import { Request, Response, NextFunction } from 'express';
import { StudentRegistration } from '../models/StudentRegistration';
import { EmergencyRequest } from '../models/EmergencyRequest';

export const getCampusOverviewStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Total counts
    const totalDonors = await StudentRegistration.countDocuments({
      systemRole: { $ne: 'admin' },
      status: 'active',
      currentWillingness: 'Willing',
      selectedRole: { $in: ['Donor', 'Both'] },
    });

    const totalFulfilled = await EmergencyRequest.countDocuments({ status: 'fulfilled' });
    const activeBroadcasts = await EmergencyRequest.countDocuments({ status: { $in: ['broadcast', 'coordinating'] } });

    // 2. Blood group distribution (aggregated)
    const bloodGroupDistribution = await StudentRegistration.aggregate([
      {
        $match: {
          systemRole: { $ne: 'admin' },
          status: 'active',
          currentWillingness: 'Willing',
          selectedRole: { $in: ['Donor', 'Both'] },
        },
      },
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 3. Campus Area / Hostel Aggregation with Small-Group Suppression (<3) for privacy protection
    const areaAggregation = await StudentRegistration.aggregate([
      {
        $match: {
          systemRole: { $ne: 'admin' },
          status: 'active',
          currentWillingness: 'Willing',
          selectedRole: { $in: ['Donor', 'Both'] },
        },
      },
      {
        $group: {
          _id: '$approximateArea',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    let otherCount = 0;
    const sanitizedAreaStats: Array<{ area: string; count: number }> = [];

    for (const item of areaAggregation) {
      if (item.count < 3) {
        otherCount += item.count;
      } else {
        sanitizedAreaStats.push({
          area: item._id || 'Campus General',
          count: item.count,
        });
      }
    }

    if (otherCount > 0) {
      sanitizedAreaStats.push({
        area: 'Other Campus Zones (Grouped for Privacy)',
        count: otherCount,
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalDonors,
        totalFulfilled,
        activeBroadcasts,
        bloodGroups: bloodGroupDistribution.map(b => ({ group: b._id, count: b.count })),
        areas: sanitizedAreaStats,
        privacyNote: 'Aggregated student distribution. Small groups (<3) are combined to protect privacy.',
      },
    });
  } catch (error) {
    next(error);
  }
};
