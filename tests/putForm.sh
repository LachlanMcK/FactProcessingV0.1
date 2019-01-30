

# curl -d @putData0.json -H "Content-Type: application/json" -X PUT http://127.0.0.1:8080/api/v1/Clients/5c3eac1535f35809adb77a13 -o putData0Out.json
# curl -d @putData0.json -H "Content-Type: application/json" -X PUT http://127.0.0.1:8080/api/v1/Clients/ABN/1234567890/Accounts/1/Roles/IT/Forms/myFT6Form/112233 -o putData0Out.json
  curl -d @putData1.json -H "Content-Type: application/json" -X PUT http://127.0.0.1:8080/api/v1/Clients/ABN/1234567890/Accounts/1/Roles/IT/Forms/myFT6Form/1111 -o putData0Out.json

echo '---put finished---'
cat putData0Out.json
read x

curl -v http://127.0.0.1:8080/api/v1/Clients/ -o getData0Out.json

echo ----output.json---
cat getData0Out.json 
read x
