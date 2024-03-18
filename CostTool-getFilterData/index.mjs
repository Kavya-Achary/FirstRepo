import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import mysql from "mysql";
import { getFilters } from "./getFilters.js";

async function error_handler(callback, error){
    callback(null, {
        isBase64Encoded: false,
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({"message:": error})
    });
}

export const handler = async (event, context, callback) => {

    const secret_name = "database/custom-apps/costengine";

    const client = new SecretsManagerClient({
        region: context.invokedFunctionArn.split(":")[3],
    });

    let response;

    try {
        response = await client.send(
            new GetSecretValueCommand({
                SecretId: secret_name,
                VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified..
            })
        );
    } catch (error) {
        console.log(error);
        error_handler(callback, 'unable to get secret value command');
    }

    const secrets = await JSON.parse(response?.SecretString);

    const poolObj = {
        host: secrets?.host,
        user: secrets?.username,
        password: secrets?.password,
        port: secrets?.port,
        database: secrets?.dbname,
    };

    let pool;
    try {
        pool = mysql.createPool(poolObj);
    } catch (error) {
        console.log(error);
        error_handler(callback, 'unable to create user pool');
    }

    const bodyJSON =  await getFilters(pool, error_handler, callback);



    const resp = {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyJSON),
    }

    return resp
}
