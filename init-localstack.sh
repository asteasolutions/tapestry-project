#!/bin/bash

awslocal s3 mb s3://local-bucket
awslocal s3api put-bucket-cors --bucket local-bucket --cors-configuration file:///localstack-s3-cors-config.json