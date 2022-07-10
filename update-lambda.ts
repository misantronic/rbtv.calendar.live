import { Lambda, config, S3 } from 'aws-sdk';
import { readFileSync } from 'fs';

const FunctionName = process.argv[2];
const path = process.argv[3];
const region = process.argv[4];

config.region = region || 'eu-central-1';

console.log('deploying lambda function', {
    region: config.region,
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

const s3 = new S3();
const Bucket = `report-royal-lambda-${config.region}`;
const Key = FunctionName;

s3.putObject({
    Bucket,
    Key,
    Body: ZipFile
})
    .promise()
    .then(() => {
        const lambda = new Lambda();

        lambda.updateFunctionCode(
            {
                FunctionName,
                S3Bucket: Bucket,
                S3Key: Key,
                Publish: true
            },
            (err, data) => {
                if (err) throw err;

                console.log(data);
            }
        );
    });
