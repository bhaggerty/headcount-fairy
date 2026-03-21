const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

function getClient() {
  const base = new DynamoDBClient({ region: process.env.AWS_REGION });
  return DynamoDBDocumentClient.from(base);
}

const TABLE = () => process.env.APP_DYNAMODB_TABLE_NAME;

async function writeReq(req) {
  const ddb = getClient();
  await ddb.send(new PutCommand({
    TableName: TABLE(),
    Item: {
      PK: req.req_id,
      SK: 'METADATA',
      ...req,
      updated_at: new Date().toISOString(),
    },
  }));
}

async function updateReq(reqId, fields) {
  const ddb = getClient();
  const raw = { ...fields, updated_at: new Date().toISOString() };
  // DynamoDB Document Client strips empty strings from ExpressionAttributeValues,
  // leaving the UpdateExpression with undefined placeholders — skip empty values.
  const entries = Object.entries(raw).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return;

  const UpdateExpression = 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', ');
  const ExpressionAttributeNames = Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k]));
  const ExpressionAttributeValues = Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v]));

  await ddb.send(new UpdateCommand({
    TableName: TABLE(),
    Key: { PK: reqId, SK: 'METADATA' },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  }));
}

async function getReq(reqId) {
  const ddb = getClient();
  const { Item } = await ddb.send(new GetCommand({
    TableName: TABLE(),
    Key: { PK: reqId, SK: 'METADATA' },
  }));
  if (!Item) throw new Error(`Req ${reqId} not found in DynamoDB`);
  return Item;
}

module.exports = { writeReq, updateReq, getReq };
