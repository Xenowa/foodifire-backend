# Project Foodifire:

## Team Members

| Student Name                    | UoW Number | IIT Number |
| ------------------------------- | ---------- | ---------- |
| T.S.D. Wanigaratne **(Leader)** | 18676790   | 20210597   |
| W.R.S.S. Gunarathna             | 1899299    | 20211178   |
| S.W.R. Minoth                   | 18677052   | 20210788   |
| I. Shanooka                     | 19128180   | 20210155   |
| B.J. Premarathna                | 1904454    | 20211467   |

## Project Details

### Technologies used

- NodeJS + Express Backend
- TensorflowJS MobileNet V2 model
- MongoDB database

### How It Works

Upon launching the application, first the user provides the disease conditions
that he faces to the application. Next when the user takes an image of a food
source he is about to consume, the image is transfered to the NodejS backend
via a POST Request. This will trigger the servers TensorflowJS Machine
Learning model to predict the image source and generate a food label. Then
the food label is sent as a query from the server to the mongodb database
server, where it will return back the diseases related to the food label.
Finally the Server will send back a JSON response containing the food label
and the relevant diseases to the frontend, where a report will be generated
by comparing user provided disease conditions with the fetched disease
conditions.

### Usage

1. Clone the Repository

2. Launch your mongodb local server using below command

```cmd
mongod --dbpath="databases_folder"
```

3. Open mongodb compass and connect

4. Create a database and collection

   - Database name: bit-legion
   - Collection name: food-disease

5. Import following file to the collection

```
📦backend
📦frontend
📦mongodb-exports
 ┗ **📜food-disease.json**
```

6. Launching the backend:

   - Create a dotenv file in the following location

   ```
   📦backend
   ┣ 📂db
   ┣ 📂tempBackendComponents
   ┃ ┗**📜.env**
   ```

   - Enter the below code to the **.env** file

   ```env
   CORS_DOMAINS=http://127.0.0.1:5173
   MONGODB_CON_URL=mongodb://localhost:27017
   ```

   - or

   ```env
   CORS_DOMAINS=http://127.0.0.1:5173
   MONGODB_CON_URL=mongodb://127.0.0.1:27017
   ```

   - Run the following commands in terminal

   ```cmd
   cd backend
   npm install
   npm run dev
   ```

7. Start using the application

## Contributing

1. Pull new changes to master branch

```cmd
git pull
```

2. Create a new branch

```cmd
git checkout -b yourName-dev
```

3. For the backend, always create new features or changes in the **tempBackendComponents** directory

```
📦foodifire-backend
┣ 📂db
┣ 📂node_modules
┣ **📂tempBackendComponents**
┃ ┗ **📜yourname_component.js**
```

4. Stage, commit and push the branch

```cmd
git add .
git commit -m "Meaningful commit message"
git push
```

5. Create a pull request in github (DO NOT MERGE)

6. switch to main branch and Delete the local branch

```cmd
git checkout master
git branch -d yourName-dev
```
