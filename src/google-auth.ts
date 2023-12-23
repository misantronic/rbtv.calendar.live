import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client
} from '@aws-sdk/client-s3';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import * as readline from 'readline';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

type SecretsKey =
    | 'rbtv.calendar-update.token'
    | 'rbtv.calendar-update.credentials';

async function streamToString(stream?: Readable): Promise<string> {
    if (!stream) {
        return '{}';
    }

    let data: string = '';
    try {
        for await (const chunk of stream) {
            data += chunk.toString();
        }
        return data;
    } catch (err) {
        console.error('Error while reading from stream', err);
        return '';
    }
}

function secrets() {
    const s3 = new S3Client({
        region: 'eu-central-1'
    });
    const Bucket = 'rbtv-secrets';

    return {
        async getSecret<T = any>(key: SecretsKey) {
            const obj = await s3.send(
                new GetObjectCommand({ Bucket, Key: key })
            );

            const bodyStr = await streamToString(
                obj.Body as Readable | undefined
            );

            return JSON.parse(bodyStr) as T;
        },

        async putSecret(key: SecretsKey, value: Object) {
            return s3.send(
                new PutObjectCommand({
                    Bucket,
                    Key: key,
                    Body: JSON.stringify(value)
                })
            );
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
