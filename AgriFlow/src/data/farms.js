export const farms = [
  { id: 1, farmerId: 1, name: 'Green Valley Farm', area: '2.5 acres', district: 'Thrissur', status: 'active' },
  { id: 2, farmerId: 1, name: 'Riverside Paddy', area: '1.8 acres', district: 'Thrissur', status: 'active' },
  { id: 3, farmerId: 1, name: 'Hill Top Banana', area: '3.0 acres', district: 'Palakkad', status: 'pending' },
];

export const fields = [
  { id: 1, farmId: 1, fieldName: 'Block A', crop: 'Paddy', soilType: 'Clay Loam', cropStage: 'Tillering', status: 'Irrigate', recommendation: 'Apply 40mm water today', verified: false },
  { id: 2, farmId: 1, fieldName: 'Block B', crop: 'Coconut', soilType: 'Sandy Loam', cropStage: 'Mature', status: 'Monitor', recommendation: 'Check soil moisture tomorrow', verified: true },
  { id: 3, farmId: 2, fieldName: 'East Section', crop: 'Banana', soilType: 'Red Laterite', cropStage: 'Flowering', status: 'Postpone', recommendation: 'Rain expected, skip irrigation', verified: false },
  { id: 4, farmId: 2, fieldName: 'West Section', crop: 'Ginger', soilType: 'Black Cotton', cropStage: 'Vegetative', status: 'Irrigate', recommendation: 'Soil moisture critically low', verified: true },
  { id: 5, farmId: 3, fieldName: 'Main Plot', crop: 'Rubber', soilType: 'Laterite', cropStage: 'Mature', status: 'Monitor', recommendation: 'Normal conditions, no urgent action', verified: false },
];

export const irrigationHistory = [
  { id: 1, fieldId: 1, date: '2025-07-20', amount: '40mm', method: 'Drip', duration: '2 hrs', confirmedRainfall: false },
  { id: 2, fieldId: 2, date: '2025-07-18', amount: '25mm', method: 'Sprinkler', duration: '1.5 hrs', confirmedRainfall: false },
  { id: 3, fieldId: 3, date: '2025-07-22', amount: '0mm', method: '-', duration: '-', confirmedRainfall: true },
  { id: 4, fieldId: 4, date: '2025-07-21', amount: '35mm', method: 'Drip', duration: '1.8 hrs', confirmedRainfall: false },
];
