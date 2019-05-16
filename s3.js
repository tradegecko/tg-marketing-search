require('dotenv').config();
const AWS = require('aws-sdk');
const { S3 } = AWS;

const S3BucketName = 'tg-marketing-search';

module.exports = {
  upload: uploadToS3,
  download: downloadFromS3,
};

async function uploadToS3(fileName, fileContents) {
  try {
    await new S3({
      apiVersion: '2006-03-01'
    })
      .putObject({
        Bucket: S3BucketName,
        Key: fileName,
        Body: fileContents,
      })
      .promise();
  } catch(error) {
    console.log(`Error occurred while uploading new site page list to ${S3BucketName}/${fileName}:`);
    console.log(error);
  }
}

async function downloadFromS3(fileName) {
  try {
    let file = await new S3({
      apiVersion: '2006-03-01'
    })
      .getObject({
        Bucket: S3BucketName,
        Key: fileName,
      })
      .promise();
    let dataString = file.Body.toString('utf8');
    let data = JSON.parse(dataString);
    return data;
  } catch(error) {
    console.log(`Error occurred while downloading new site page list from ${S3BucketName}/${fileName}:`);
    console.log(error);
  }
}
