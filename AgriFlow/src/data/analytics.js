export const waterAllocation = [
  { id: 1, farmer: 'Ramesh Kumar', field: 'Block A', waterNeeded: '40,000 L', priority: 'High', status: 'Approved', allocated: '40,000 L' },
  { id: 2, farmer: 'Ravi Shankar', field: 'North Plot', waterNeeded: '28,000 L', priority: 'Medium', status: 'Pending', allocated: '-' },
  { id: 3, farmer: 'Meena Devi', field: 'East Field', waterNeeded: '60,000 L', priority: 'Critical', status: 'Approved', allocated: '55,000 L' },
  { id: 4, farmer: 'Gopalan N', field: 'South Block', waterNeeded: '12,000 L', priority: 'Low', status: 'Rejected', allocated: '-' },
  { id: 5, farmer: 'Radha Krishnan', field: 'Main Plot', waterNeeded: '35,000 L', priority: 'Medium', status: 'Pending', allocated: '-' },
];

export const notifications = [
  { id: 1, role: 'farmer', message: 'Irrigation recommended for Block A today.', time: '8:00 AM', read: false },
  { id: 2, role: 'farmer', message: 'Rain forecasted tomorrow – consider postponing.', time: '7:30 AM', read: false },
  { id: 3, role: 'supervisor', message: 'Field verification pending for Farm 3.', time: '9:00 AM', read: false },
  { id: 4, role: 'manager', message: 'Water shortage alert: Thrissur zone.', time: '6:00 AM', read: false },
  { id: 5, role: 'maintenance', message: 'New complaint assigned: C-002 Pump Failure.', time: '10:00 AM', read: false },
  { id: 6, role: 'admin', message: 'New farmer registered: Ravi Shankar.', time: '11:00 AM', read: false },
];

export const analytics = {
  weeklyWaterUsage: [
    { day: 'Mon', usage: 1200 }, { day: 'Tue', usage: 800 }, { day: 'Wed', usage: 0 },
    { day: 'Thu', usage: 1500 }, { day: 'Fri', usage: 1100 }, { day: 'Sat', usage: 900 }, { day: 'Sun', usage: 600 },
  ],
  cropStressTrend: [
    { week: 'W1', stress: 3 }, { week: 'W2', stress: 5 }, { week: 'W3', stress: 2 },
    { week: 'W4', stress: 7 }, { week: 'W5', stress: 4 },
  ],
  verificationProgress: [
    { name: 'Approved', value: 18 }, { name: 'Pending', value: 7 }, { name: 'Rejected', value: 3 },
  ],
  waterConsumption: [
    { month: 'Jan', volume: 120000 }, { month: 'Feb', volume: 140000 }, { month: 'Mar', volume: 180000 },
    { month: 'Apr', volume: 220000 }, { month: 'May', volume: 310000 }, { month: 'Jun', volume: 410000 }, { month: 'Jul', volume: 390000 },
  ],
  userGrowth: [
    { month: 'Jan', users: 10 }, { month: 'Feb', users: 18 }, { month: 'Mar', users: 32 },
    { month: 'Apr', users: 47 }, { month: 'May', users: 61 }, { month: 'Jun', users: 74 }, { month: 'Jul', users: 89 },
  ],
  priorityDist: [
    { name: 'Critical', value: 4 }, { name: 'High', value: 10 }, { name: 'Medium', value: 18 }, { name: 'Low', value: 8 },
  ],
};
