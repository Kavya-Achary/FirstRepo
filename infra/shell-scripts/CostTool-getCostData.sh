#!/bin/bash


function_name="CostTool-getCostData"
update_command=""
update_command=""
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "ACCOUNT_ID: $ACCOUNT_ID"
export ACCOUNT_ID=$ACCOUNT_ID
aws lambda get-function --function-name "$function_name" && update_command="update" || update_command="create"

################ Create or update the Lambda function###############
if [ "$update_command" = "update" ]; then
  aws lambda update-function-code --function-name "$function_name" --zip-file fileb://CostTool-getCostData.zip
  function_arn_data=$(aws lambda get-function --function-name "$function_name" --query 'Configuration.FunctionArn' --output text)
  echo "Updated Lambda function ARN: $function_arn_data"
  export LAMBDA_FUNCTION_ARN="$function_arn_data"

else
  response=$(aws lambda create-function --function-name "$function_name" --runtime nodejs18.x --role arn:aws:iam::$ACCOUNT_ID:role/costengine-services-lambda-role --handler index.handler --layers "$LAYER_ARN" --vpc-config SubnetIds="$SUBNET_IDS",SecurityGroupIds="$SECURITYGROUP_ID" --timeout 300 --zip-file fileb://CostTool-getCostData.zip)
  function_arn_data=$(echo "$response" | jq -r '.FunctionArn')  # Assuming you have jq installed for JSON parsing
  echo "Lambda function ARN: $function_arn_data"
  export LAMBDA_FUNCTION_ARN="$function_arn_data"
fi
