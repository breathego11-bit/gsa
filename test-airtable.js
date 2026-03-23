import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_AIRTABLE_API_KEY;
const baseId = process.env.VITE_AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
    console.error('Missing credentials in .env');
    process.exit(1);
}

// Adjust Airtable configure to use endpointUrl if needed, but usually default is fine.
// Using standard instantiation
const base = new Airtable({ apiKey }).base(baseId);

async function testConnection() {
    console.log(`Testing connection to Base: ${baseId}`);
    try {
        // Attempt to select 1 record from 'LEADS' or 'CLOSERS'
        // The user mentioned 'LEADS', 'CLOSERS', 'LLAMADAS', 'PAGOS' tables.
        // Let's try 'CLOSERS' first as it is used for auth.
        const records = await base('CLOSERS').select({ maxRecords: 1 }).firstPage();
        console.log('Successfully connected!');
        if (records.length > 0) {
            console.log('Retrieved record ID:', records[0].id);
            console.log('Sample fields:', JSON.stringify(records[0].fields));
        } else {
            console.log('Connected but table CLOSERS is empty.');
        }
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

testConnection();
