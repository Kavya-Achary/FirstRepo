#!/bin/bash

set -x  # Enable debugging

# Branch name (default: main)
BRANCH="main"

# Extracting repository owner and name from URL
REPO_URL="${CODEBUILD_SOURCE_REPO_URL%.git}"
REPO_NAME=$(basename "$REPO_URL")
OWNER=$(dirname "$REPO_URL" | sed 's|^https://github.com/||')

# API URL to get the latest commit
API_URL="https://api.github.com/repos/${OWNER}/${REPO_NAME}/commits/${BRANCH}"

# Get the latest commit data
commit_data=$(curl -s $API_URL)

# Print the received commit data for debugging
echo "Received commit data:"
echo "$commit_data"

# Check if there's an error message in the response
error_message=$(echo "$commit_data" | jq -r '.message')
if [[ $error_message != "null" ]]; then
    echo "Error: $error_message"
    exit 1
fi

# Extract the commit SHA
commit_sha=$(echo "$commit_data" | jq -r '.sha')

# Check if the commit SHA is null
if [[ $commit_sha == "null" ]]; then
    echo "Error: Unable to fetch the commit SHA"
    exit 1
fi

# API URL to get the files changed in the latest commit
API_URL="https://api.github.com/repos/${OWNER}/${REPO_NAME}/commits/${commit_sha}"

# Get the files changed in the latest commit
files_changed=$(curl -s $API_URL | jq -r '.files[].filename')

# Print the list of changed files for debugging
echo "Files changed in the latest commit:"
echo "$files_changed"

# Loop through the changed files and check if they are in a specific folder
for file in $files_changed; do
    if [[ $file == "path/to/your/folder"* ]]; then
        echo "File changed: $file"
    fi
done