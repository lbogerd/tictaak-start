#!/usr/bin/env bash

# Run the Prisma command and provide the confirmation after 2 seconds
{
  sleep 2
  printf 'i will lose local data\r\n'
} | npx prisma dev rm --force test-db
