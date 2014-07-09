var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ibmdb = require('ibm_db');


if (process.env.VCAP_SERVICES) {
    env = JSON.parse(process.env.VCAP_SERVICES);
}

var credentials = env["sqldb"][0]["credentials"];
var dsnString = "DRIVER={DB2};DATABASE=" + credentials.db + ";UID=" + credentials.username + ";PWD=" +
    credentials.password + ";HOSTNAME=" + credentials.hostname + ";port=" + credentials.port;


var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.post('/', function(req, res) {
    if(req.body.clear){
        ibmdb.open(dsnString, function(err, conn){
            if (err) res.send({success: false, reason: "can't connect to the database server :" + err});
            else{
                var sql = "DROP TABLE EMPLOYEES;";
                conn.querySync(sql);
                var sql = "CREATE TABLE EMPLOYEES (NAME VARCHAR(50),DEPARTMENT VARCHAR(20), SALARY INT, EMPNO INT NOT NULL PRIMARY KEY);";
                conn.querySync(sql);
                res.send({success: true, reason: "schema has been reset to its original form"});
            }
        });
    } else {
        ibmdb.open(dsnString, function (err, conn){
            if (err) res.send({success: false, reason: "can't connect to the database server :" + err});
            else {
                var sql = "SELECT * FROM EMPLOYEES;"
                conn.query(sql, function (err, data){
                    if (err) res.send({success: false, reason: "can't execute sql query :" + err });
                    else res.send({success: true, data: data});
                });
            }
        });
    }
});

app.post('/addEmployee', function (req, res){
    var name = req.body.name;
    var empno = req.body.id;
    var department = req.body.department;
    var salary = req.body.salary;

    var sql = "INSERT INTO EMPLOYEES (NAME,DEPARTMENT,SALARY,EMPNO) VALUES ('" + name + "','" + department + "'," + salary + "," + empno + ");";
    ibmdb.open(dsnString, function(err, conn){
        if (err) res.send({success: false, reason: "can't connect to the database server :" + err});
        else {
            conn.query(sql, function(err){
                if (err) res.send({success: false, reason: "can't add employee :" + err});
                else res.send({success: true, data: {name: name, id: empno, department: department, salary: salary}});
            });
        }
    });
});

app.post('/removeEmployee', function (req, res){
    var id = req.body.id;

    var sql = "DELETE FROM EMPLOYEES WHERE EMPNO= " + id + ";";

    ibmdb.open(dsnString, function (err, conn){
        if (err) res.send({success: false, reason: "can't connect to the database server :" + err});
        else {
            conn.query(sql, function(err){
                if (err) res.send({success: false, reason: "can't remove employee :" + err});
                else res.send({success: true, id: id});
            });
        }
    });
});

app.post('/findEmployee', function (req, res){
    var id = req.body.id;

    var sql = "SELECT * FROM EMPLOYEES WHERE EMPNO= " + id + ";";

    ibmdb.open(dsnString, function (err, conn){
        if (err)  res.send({success: false, reason: "can't connect to the database server :" + err});
        else {
            conn.query(sql, function (err, data) {
                if (err) res.send({success: false, reason: "can't retrieve employee :" + err});
                else res.send({success: true, data: data});
            });
        }
    });
});

app.listen(process.env.VCAP_APP_PORT);
