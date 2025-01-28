const assert = require('assert');
const express = require('express');
const app = express();
const request = require('supertest');
app.use(express.json());

const routes = require('/var/www/spvaTrack/routes');
const { default: de } = require('date-and-time/locale/de');
app.use('/', routes);

describe('Array', function() {
    describe('#indexOf()', function() {
        it('should return -1 when the value is not present', function() {
            assert.strictEqual([1, 2, 3].indexOf(4), -1);
        });

        it('should return the index when the value is present', function() {
            assert.strictEqual([1, 2, 3].indexOf(2), 1);
        });
    });

    describe('#push()', function() {
        it('should add a value to the end of the array', function() {
            const arr = [1, 2, 3];
            arr.push(4);
            assert.strictEqual(arr[arr.length - 1], 4);
        });

        it('should increase the length of the array', function() {
            const arr = [1, 2, 3];
            arr.push(4);
            assert.strictEqual(arr.length, 4);
        });
    });

    describe('#pop()', function() {
        it('should remove the last value of the array', function() {
            const arr = [1, 2, 3];
            const popped = arr.pop();
            assert.strictEqual(popped, 3);
        });

        it('should decrease the length of the array', function() {
            const arr = [1, 2, 3];
            arr.pop();
            assert.strictEqual(arr.length, 2);
        });
    });
});

describe('POST /payment', function() {
    it('responds with html', function(done) {
        request(app)
            .post('/payment')
            .send({
                invoice_number: '123456',

            })
            .set('Accept', 'application/json')
            .expect(200, done);
    });
});

// console.log("/create-invoice recieved", req.body)
// const {
//   customer_name,
//   custom_amount,
//   takeoff_id
// // } = req.body;

// describe('POST /create-invoice', function() {
//     it('responds with html', function(done) {
//         request(app)
//             .post('/create-invoice')
//             .send({
//                 customer_name: 'John Doe',
//                 custom_amount: 100,
//                 takeoff_id: 1
//             })
//             .set('Accept', 'application/json')
//             .expect(200, done);
//     });
// }
// );