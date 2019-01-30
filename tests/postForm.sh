
# this url is dodgy 
curl -d @postData.json -H "Content-Type: application/json" -X POST http://127.0.0.1:8080/api/v1/Clients/ -o post2.json
echo '---post finished---'
cat post2.json
read x

curl -v http://127.0.0.1:3000/forms -o getFormOutput.json

echo ----output.json---
cat getFormOutput.json 
read x
