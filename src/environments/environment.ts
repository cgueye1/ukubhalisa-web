// 📁 Fichier 1 : src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'https://innov.sn',
  apiUrl: 'https://innov.sn/api',
  apiUrlAddress:'https://innov.sn/api/pointing-addresses',
  filebaseUrl: 'https://innov.sn/repertoire_u/',
  endpoints: {
    // Dashboard Admin & Subscriptions
    subscriptions: 'https://innov.sn/api/subscriptions',
    users: 'https://innov.sn/api/v1/user',
  
    // Pharma Delivery Auth (ancien système)
    pharmaAuth: 'https://innov.sn/pharma-delivery/api/auth',
    pharmaDelivery: 'https://innov.sn/pharma-delivery/api',
  
    // Main Auth System (nouveau système)
    auth: 'https://innov.sn/api/v1/auth',
    user: 'https://innov.sn/preproduk/api/v1/user',
    
    // Dashboard & KPIs
    tasks: 'https://innov.sn/api/tasks',
    indicators: 'https://innov.sn/api/indicators',
    budgets: 'https://innov.sn/api/budgets',
    materials: 'https://innov.sn/api/materials',
    incidents: 'https://innov.sn/api/incidents',
    progressAlbum: 'https://innov.sn/api/progress-album',
    workers: 'https://innov.sn/api/workers'
  }
};