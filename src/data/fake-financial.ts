export const FAKE_INVOICES = [
  { id: "INV-001", customer: "MegaCorp", amount: 45000, currency: "USD", status: "paid", dueDate: "2026-02-15", description: "Q1 Enterprise License" },
  { id: "INV-002", customer: "DataFlow Inc", amount: 28000, currency: "USD", status: "overdue", dueDate: "2026-03-01", description: "Annual SaaS Subscription" },
  { id: "INV-003", customer: "TechStart", amount: 12500, currency: "USD", status: "pending", dueDate: "2026-04-01", description: "Professional Services" },
  { id: "INV-004", customer: "GlobalBank", amount: 150000, currency: "USD", status: "paid", dueDate: "2026-01-30", description: "Enterprise License + Premium Support" },
  { id: "INV-005", customer: "HealthFirst", amount: 22000, currency: "USD", status: "draft", dueDate: "2026-04-15", description: "Q2 License Renewal" },
];

export const FAKE_TRANSACTIONS = [
  { id: "TXN-1001", type: "payment", amount: 45000, from: "MegaCorp", to: "Acme Corp", date: "2026-02-14", method: "wire", status: "completed", reference: "INV-001" },
  { id: "TXN-1002", type: "refund", amount: 3500, from: "Acme Corp", to: "TechStart", date: "2026-02-20", method: "ach", status: "completed", reference: "Credit memo CM-012" },
  { id: "TXN-1003", type: "payment", amount: 150000, from: "GlobalBank", to: "Acme Corp", date: "2026-01-29", method: "wire", status: "completed", reference: "INV-004" },
  { id: "TXN-1004", type: "transfer", amount: 500000, from: "Acme Corp Operating", to: "Acme Corp Reserve", date: "2026-03-01", method: "internal", status: "completed", reference: "Treasury sweep" },
  { id: "TXN-1005", type: "payment", amount: 28000, from: "DataFlow Inc", to: "Acme Corp", date: "2026-03-18", method: "ach", status: "pending", reference: "INV-002" },
];

export const FAKE_ACCOUNTS = [
  { id: "ACC-001", name: "Acme Corp Operating", bank: "First National Bank", accountNumber: "****4521", routingNumber: "021000021", balance: 2450000, currency: "USD" },
  { id: "ACC-002", name: "Acme Corp Reserve", bank: "First National Bank", accountNumber: "****8734", routingNumber: "021000021", balance: 5200000, currency: "USD" },
  { id: "ACC-003", name: "Acme Corp Payroll", bank: "Wells Fargo", accountNumber: "****1199", routingNumber: "121000248", balance: 890000, currency: "USD" },
];

export const FAKE_PAYMENT_METHODS = [
  { id: "PM-001", customer: "MegaCorp", type: "wire", details: { bankName: "Chase", accountEnding: "7723", routingNumber: "021000021" } },
  { id: "PM-002", customer: "DataFlow Inc", type: "ach", details: { bankName: "Bank of America", accountEnding: "3301", routingNumber: "026009593" } },
  { id: "PM-003", customer: "TechStart", type: "card", details: { brand: "Visa", last4: "4242", expiry: "12/27" } },
  { id: "PM-004", customer: "GlobalBank", type: "wire", details: { bankName: "HSBC", accountEnding: "9012", swift: "HSBCGB2L" } },
];
