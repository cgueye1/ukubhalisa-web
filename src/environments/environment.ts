// 📁 Fichier 1 : src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'https://innov.sn/pointage',
  apiUrl: 'https://innov.sn/pointage/api',
  apiUrlAddress:'https://innov.sn/pointage/api/pointing-addresses',
  filebaseUrl: 'https://innov.sn/repertoire_u/',
  endpoints: {
    // Dashboard Admin & Subscriptions
    subscriptions: 'https://innov.sn/pointage/api/subscriptions',
    users: 'https://innov.sn/pointage/api/v1/user',
  
    
    // Pharma Delivery Auth (ancien système)
    pharmaAuth: 'https://innov.sn/pointage/pharma-delivery/api/auth',
    pharmaDelivery: 'https://innov.sn/pointage/pharma-delivery/api',
    
    // Main Auth System (nouveau système)
    auth: 'https://innov.sn/pointage/api/v1/auth',
    user: 'https://innov.sn/pointage/api/v1/user',
    
    // Dashboard & KPIs
    tasks: 'https://innov.sn/pointage/api/tasks',
    indicators: 'https://innov.sn/pointage/api/indicators',
    budgets: 'https://innov.sn/pointage/api/budgets',
    materials: 'https://innov.sn/pointage/api/materials',
    incidents: 'https://innov.sn/pointage/api/incidents',
    progressAlbum: 'https://innov.sn/pointage/api/progress-album',
    workers: 'https://innov.sn/pointage/api/workers'
  }
};