import {
    LambdaClient,
    UpdateFunctionCodeCommand
} from '@aws-sdk/client-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const FunctionName = process.argv[2];
const path = process.argv[3];
const region = process.argv[4] || 'eu-central-1';

console.log('deploying lambda function', {
    region,
    FunctionName,
    path
});

if (!FunctionName) {
    throw new Error('please provide a FunctionName');
}

if (!path) {
    throw new Error('please provide a path to a zip-file');
}

const ZipFile = readFileSync(path);

const s3 = new S3Client();
const Bucket = `report-royal-lambda-${region}`;
const Key = FunctionName;

s3.send(
    new PutObjectCommand({
        Bucket,
        Key,
        Body: ZipFile
    })
).then(async () => {
    const lambda = new LambdaClient();

    const result = await lambda.send(
        new UpdateFunctionCodeCommand({
            FunctionName,
            S3Bucket: Bucket,
            S3Key: Key,
            Publish: true
        })
    );

    console.log(result);
});
