import { google } from 'googleapis';
import * as readline from 'readline';
import { OAuth2Client } from 'google-auth-library';
import { DateTime } from 'luxon';
import { S3 } from 'aws-sdk';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

type SecretsKey =
    | 'rbtv.calendar-update.token'
    | 'rbtv.calendar-update.credentials';

function secrets() {
    const s3 = new S3({
        region: 'eu-central-1'
    });
    const Bucket = 'rbtv-secrets';

    return {
        async getSecret<T = any>(key: SecretsKey) {
            const obj = await s3.getObject({ Bucket, Key: key }).promise();

            const bodyStr = obj.Body?.toString();

            if (bodyStr) {
                return JSON.parse(bodyStr) as T;
            }

            throw new Error('Not found');
        },

        async putSecret(key: SecretsKey, value: Object) {
            return s3
                .putObject({ Bucket, Key: key, Body: JSON.stringify(value) })
                .promise();
        }
    };
}

export async function authorize() {
    const { getSecret, putSecret } = secrets();
    const credentials = await getSecret<{
        client_id: string;
        client_secret: string;
        redirect_uri: string;
    }>('rbtv.calendar-update.credentials');

    if (!credentials) {
        throw new Error('credentials are undefined');
    }

    const oAuth2Client = new google.auth.OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.redirect_uri
    );

    return new Promise<OAuth2Client>(async (resolve) => {
        const token = await getSecret<{
            access_token: string;
            refresh_token: string;
            scope: string;
            token_type: 'Bearer';
            expiry_date: number;
        }>('rbtv.calendar-update.token');

        if (token && Object.keys(token).length !== 0) {
            oAuth2Client.setCredentials(token);

            if (token.expiry_date < DateTime.now().toMillis()) {
                const { credentials } = await oAuth2Client.refreshAccessToken();

                await putSecret('rbtv.calendar-update.token', credentials);
            }

            resolve(oAuth2Client);
        } else {
            resolve(getAccessToken(oAuth2Client));
        }
    });
}

function getAccessToken(oAuth2Client: OAuth2Client): Promise<OAuth2Client> {
    const { putSecret } = secrets();

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });

    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, async (err, token) => {
                if (err) {
                    return console.error('Error retrieving access token', err);
                }

                if (token) {
                    oAuth2Client.setCredentials(token);

                    await putSecret('rbtv.calendar-update.token', token);

                    resolve(oAuth2Client);
                }
            });
        });
    });
}
