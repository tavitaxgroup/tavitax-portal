import { google } from "googleapis";

/**
 * Returns an authenticated Google Sheets API client
 * using the Service Account credentials from environment variables.
 */
export async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  return sheets;
}

/**
 * Appends a row of values to the specified Google Sheet.
 */
export async function appendToSheet(
  spreadsheetId: string,
  range: string,
  values: string[][]
) {
  const sheets = await getGoogleSheetsClient();

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values,
    },
  });

  return response.data;
}
