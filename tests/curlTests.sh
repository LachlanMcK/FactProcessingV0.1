curl -d '{"name":"myName", "email":"myemail@gmail.com", "password": "myPassword"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:3000/users -o post.json
echo '---post finished---'
cat post.json
read x

curl -d '{"formType":"myFT1", "betNumber":"112233", "sections": "{blah}"}' -H "Content-Type: application/json" -X POST http://127.0.0.1:3000/forms -o post2.json
echo '---post finished---'
cat post2.json
read x


#curl -d '{"name":"myName", "email":"myemail@gmail.com", "password": "myPassword"}' -H "Content-Type: application/json" -X POST http://54.172.81.139:8080/users
#curl -d '{"formType":"myFT1", "betNumber":"112233", "sections": "{blah}"}' -H "Content-Type: application/json" -X POST http://54.172.81.139:8080/forms
