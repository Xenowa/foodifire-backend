const request = require('supertest');
const server = require('../app');

// describe('GET /', () => {
//   it('should return 200 OK', async () => {
//     const result = await request(server).get('/')

//     expect(result.status).toBe(200)
//   })
  
//   it('should return a welcome message', async() => {
//     // ========
//     // METHOD 1 (No async awaits)
//     // ========
//     // request(server).get("/").then((res) =>{
//       //   expect(res.text).toBe("<h1>Welcome to foodifire 🔥</h1>")
//       // })
      
//     // ========
//     // METHOD 2 (async await)
//     // ========
//     const res = await request(server).get("/")

//     expect(res.text).toBe("<h1>Welcome to foodifire 🔥</h1>")
//   });
  


//===============
// invalid Number
//===============
describe('POST /getReport', () => {
it('should return an error if the image url was a number', async () => {
  const res = await request(server)
    .post('/getReport')
    .send({ image: 12345 }) 

  expect(res.status).toBe(400);
  expect(res.body.message).toBe('Error!, Number inputs not allowed!');
});

//===============
// invalid String
//===============
it('should return an error if the image url was a string', async () => {
  const res = await request(server)
    .post('/getReport')
    .send({ image: 'String Input' }) 

  expect(res.status).toBe(400);
  expect(res.body.message).toBe('Error!, Invalid format');
});
  
// =========
//  no image
// =========
it('should return an error if no image was provided', async () => {
  const res = await request(server)
    .post('/getReport')

  expect(res.status).toBe(400);
  expect(res.body.message).toBe('Error!, Empty inputs not allowed!');
});
  
})