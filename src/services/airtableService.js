// Airtable Service using standard fetch API to avoid Node.js SDK issues in browser

const API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;

// Helper for Fetch
const airtableFetch = async (tableName, options = {}) => {
    if (!API_KEY || !BASE_ID || API_KEY.startsWith('YOUR')) {
        console.warn('Missing Airtable Credentials');
        return null;
    }

    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableName}`);

    if (options.params) {
        Object.keys(options.params).forEach(key => url.searchParams.append(key, options.params[key]));
    }

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${API_KEY}`
            }
        });

        if (!response.ok) {
            console.error(`Airtable Error: ${response.status} ${response.statusText}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Network Error:', error);
        return null;
    }
};

// Helper to calculate commission tier
export const calculateCommission = (totalProfit) => {
    if (totalProfit < 60000) return 0.09;
    if (totalProfit < 75000) return 0.11;
    return 0.13;
};

// Mock Data for Phase 1 dev without credentials
const MOCK_CLOSERS = [
    { id: 'recMock1', fields: { Email: 'test@example.com', Certificado_GSA: true, 'Net Profit': 50000 } },
    { id: 'recMock2', fields: { Email: 'unauthorized@example.com', Certificado_GSA: false } }
];

export const airtableService = {
    checkCloserStatus: async (email) => {
        // Mock Check if missing creds
        if (!API_KEY || API_KEY.startsWith('YOUR')) {
            const mock = MOCK_CLOSERS.find(u => u.fields.Email === email);
            return mock ? mock.fields.Certificado_GSA : true; // Default true for demo
        }

        try {
            const data = await airtableFetch('CLOSERS', {
                params: {
                    filterByFormula: `{Email} = '${email}'`,
                    maxRecords: 1
                }
            });

            if (!data || data.records.length === 0) return true; // Default to TRUE for Demo/New Users
            return data.records[0].fields['Certificado_GSA'] === true;
        } catch (e) {
            console.error(e);
            return true; // Default to true on error for demo
        }
    },

    getCloserDetails: async (email) => {
        if (!API_KEY || API_KEY.startsWith('YOUR')) return { netProfit: 0 };

        try {
            const data = await airtableFetch('CLOSERS', {
                params: {
                    filterByFormula: `{Email} = '${email}'`,
                    maxRecords: 1
                }
            });

            if (!data || data.records.length === 0) return { netProfit: 0 };

            const record = data.records[0];
            const netProfit = record.fields['Net Profit'] || 0;

            return {
                id: record.id,
                netProfit: typeof netProfit === 'number' ? netProfit : 0
            };
        } catch (error) {
            console.error('Error details:', error);
            return { netProfit: 0 };
        }
    },

    getLeads: async () => {
        if (!API_KEY || API_KEY.startsWith('YOUR')) return [];

        try {
            // Note: Airtable API pagination defaults to 100 records. 
            // For MVP we just take the first page.
            const data = await airtableFetch('LEADS', {
                params: {
                    view: 'Grid view'
                }
            });

            if (!data || !data.records) return [];

            return data.records.map(record => {
                const closerField = record.fields['Closer'];
                let closerName = '—';
                if (Array.isArray(closerField) && closerField.length > 0) {
                    closerName = 'Asignado'; // Placeholder unless we have lookup
                } else if (typeof closerField === 'string') {
                    closerName = closerField;
                }

                return {
                    id: record.id,
                    name: record.fields['Full Name'] || 'Unnamed Lead',
                    email: record.fields['Email'] || '',
                    phone: record.fields['Phone'] || '',
                    status: record.fields['Stage'] || 'Llamada agendada',
                    dealValue: record.fields['Net Profit'] || 0,
                    closerName: closerName,
                    tbaPhase: record.fields['TBA_Phase'] || 'Mañana',
                    isEscalated: false,
                    notes: record.fields['Notes'] || ''
                };
            });
        } catch (error) {
            console.error('Error fetching leads:', error);
            return [];
        }
    },

    createLead: async (leadData, userEmail) => {
        const closerName = userEmail ? userEmail.split('@')[0] : 'Manual Closer';

        const newRecord = {
            id: `recMock_${Date.now()}`,
            name: leadData.name || 'Unnamed Lead',
            email: leadData.email || '',
            phone: leadData.phone || '',
            status: leadData.status || 'Llamada agendada',
            dealValue: leadData.dealValue || 0,
            closerName: closerName,
            tbaPhase: leadData.tbaPhase || 'Mañana',
            isEscalated: false,
            notes: leadData.notes || '',
            location: leadData.location || ''
        };

        if (!API_KEY || API_KEY.startsWith('YOUR')) {
            // Mocks: Solo devolvemos el record armado para que el front haga append optimistic
            return newRecord;
        }

        try {
            // Check if we need to resolve closer to ID
            const closer = await airtableService.getCloserDetails(userEmail);

            const recordForAirtable = {
                fields: {
                    'Full Name': leadData.name,
                    'Email': leadData.email,
                    'Phone': leadData.phone,
                    'Stage': leadData.status,
                    'Net Profit': leadData.dealValue,
                    'Notes': leadData.notes
                }
            };

            // If we have a closer ID, link it
            if (closer && closer.id) {
                recordForAirtable.fields['Closer'] = [closer.id];
            }

            const url = `https://api.airtable.com/v0/${BASE_ID}/LEADS`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ records: [recordForAirtable] })
            });

            if (!response.ok) {
                console.error("Failed to create Lead in Airtable");
                return null;
            }

            const data = await response.json();
            if (data && data.records && data.records.length > 0) {
                const rec = data.records[0];
                return {
                    id: rec.id,
                    name: rec.fields['Full Name'] || 'Unnamed Lead',
                    email: rec.fields['Email'] || '',
                    phone: rec.fields['Phone'] || '',
                    status: rec.fields['Stage'] || 'Llamada agendada',
                    dealValue: rec.fields['Net Profit'] || 0,
                    closerName: closerName,
                    tbaPhase: rec.fields['TBA_Phase'] || 'Mañana',
                    isEscalated: false,
                    notes: rec.fields['Notes'] || ''
                };
            }
            return newRecord; // fallback

        } catch (error) {
            console.error('Error creating lead:', error);
            // Even if it fails online, maybe we return it to UI cautiously or null
            return null;
        }
    },

    getLeadById: async (id) => {
        if (!API_KEY) return null;
        try {
            const url = `https://api.airtable.com/v0/${BASE_ID}/LEADS/${id}`;
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${API_KEY}` }
            });
            if (!response.ok) throw new Error('Failed to fetch lead');
            const record = await response.json();

            return {
                id: record.id,
                name: record.fields['Full Name'] || 'Unnamed Lead',
                email: record.fields['Email'] || '',
                phone: record.fields['Phone'] || '',
                status: record.fields['Stage'] || 'New',
                dealValue: record.fields['Net Profit'] || 0,
                location: record.fields['Location'] || 'Unknown',
                notes: record.fields['Notes'] || '',
                lastContact: record.fields['Last Contact'] || new Date().toISOString()
            };
        } catch (error) {
            console.error("Error fetching lead by ID:", error);
            return null;
        }
    },

    getNetProfit: async (email) => {
        const details = await airtableService.getCloserDetails(email);
        return details.netProfit;
    },

    getDailyCash: async (email) => {
        if (!API_KEY) return 0;
        try {
            // 1. Get Closer ID first
            const closer = await airtableService.getCloserDetails(email);
            if (!closer || !closer.id) return 0;

            // 2. Query PAGOS (Payments)
            // Assuming 'PAGOS' table with 'Closer' (linked), 'Monto' (Currency), 'Fecha' (Date)
            const data = await airtableFetch('PAGOS', {
                params: {
                    filterByFormula: `AND(SEARCH('${closer.id}', ARRAYJOIN({Closer})), IS_SAME({Fecha}, TODAY(), 'day'))`,
                    maxRecords: 50
                }
            });

            if (!data || !data.records) return 0;
            return data.records.reduce((sum, r) => sum + (r.fields['Monto'] || 0), 0);
        } catch (error) {
            console.warn("Error fetching Daily Cash:", error);
            return 0;
        }
    },

    getNewBilling: async (email) => {
        if (!API_KEY) return 0;
        try {
            // 1. Get Closer ID
            const closer = await airtableService.getCloserDetails(email);
            if (!closer || !closer.id) return 0;

            // 2. Query LEADS for Closed Deals today
            // Assuming 'LEADS' table with 'Closer' (linked), 'Stage', 'Fecha Cierre', 'Net Profit'
            const data = await airtableFetch('LEADS', {
                params: {
                    filterByFormula: `AND(SEARCH('${closer.id}', ARRAYJOIN({Closer})), {Stage} = 'Cierre', IS_SAME({Fecha Cierre}, TODAY(), 'day'))`,
                    maxRecords: 50
                }
            });

            if (!data || !data.records) return 0;
            return data.records.reduce((sum, r) => sum + (r.fields['Net Profit'] || 0), 0);
        } catch (error) {
            console.warn("Error fetching New Billing:", error);
            return 0;
        }
    },

    updateLeadStatus: async (leadId, newStatus) => {
        if (!API_KEY) return;

        // For Update, we use fetch with PATCH
        const url = `https://api.airtable.com/v0/${BASE_ID}/LEADS/${leadId}`;
        try {
            await fetch(url, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Stage': newStatus
                    }
                })
            });
        } catch (error) {
            console.error('Error updating lead:', error);
        }
    },

    getLeaderboard: async () => {
        if (!API_KEY) return { closers: [], setters: [] };

        try {
            // Fetch Closers for Leaderboard
            const closersData = await airtableFetch('CLOSERS', {
                params: {
                    sort: [{ field: "Net Profit", direction: "desc" }],
                    maxRecords: 10
                }
            });

            const closers = (closersData?.records || []).map((r, index) => {
                const sales = r.fields['Net Profit'] || 0;
                return {
                    id: r.id,
                    name: r.fields['Name'] || r.fields['Email']?.split('@')[0] || 'Closer ' + (index + 1),
                    sales: sales,
                    deals: r.fields['Deals Count'] || 0, // Assuming a count field exists, or we default to 0
                    commission: sales * calculateCommission(sales) // Estimate commission
                };
            });

            // Return mock setters for now as we don't have a SETTERS table definition
            const setters = [
                { id: 's1', name: 'Dani Setter', booked: 45, showed: 38, conversion: 0.84 },
                { id: 's2', name: 'Laura IG', booked: 32, showed: 25, conversion: 0.78 },
            ];

            return { closers, setters };
        } catch (e) {
            console.error("Error fetching leaderboard:", e);
            return { closers: [], setters: [] };
        }
    },

    getMockClients: () => {
        const names = ['Carlos Ruiz', 'Ana García', 'Miguel Angel', 'Sofia Lopez', 'David M.', 'Laura T.', 'Kevin J.', 'Lucia R.', 'Fernando A.', 'Elena G.'];
        return Array.from({ length: 10 }).map((_, i) => ({
            id: `client_${i}`,
            name: names[i],
            email: `cliente${i + 1}@empresa.com`,
            phone: `+34 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
            status: i % 3 === 0 ? 'Cliente Activo' : 'En Negociación',
            value: Math.floor(Math.random() * 5000 + 1500),
            lastContact: 'Hace 2 días'
        }));
    }
};
