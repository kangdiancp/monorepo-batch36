## Command Sequelize

### 1. Create init sequelize
  ```bash
  npx sequelize-cli init                                      
  ```

### 2. Create file .sequelizerc
File .sequelizerc adalah file config kustom agar sequelize membaca file config dan baca folder models, seed, dan migrations.

    ```javascript
    const path = require('path');
    
    module.exports = {
      'config':          path.resolve('config', 'database.js'), 
      'models-path':     path.resolve('src', 'shared', 'utils', 'models'),
      'migrations-path': path.resolve('src', 'shared', 'utils', 'migrations'),
      'seeders-path':    path.resolve('src', 'shared', 'utils', 'seeders'),
    };
    ```

### 3. Run command sequelieze

* Create file migration
  ```bash
  npx sequelize-cli migration:generate --name sync-schema-oe
  ```
* Create file seed
  ```bash
  npx sequelize-cli seed:generate --name seed-schema-oe
  ```

### 4. Run command via script
Pastikan command dibawah sesuai script di file package.json

```json
//package.json
"scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "db:migrate": "sequelize-cli db:migrate",
    "db:undo": "sequelize-cli db:migrate:undo",
    "db:seed": "sequelize-cli db:seed:all",
    "db:reset": "sequelize-cli db:migrate:undo:all && sequelize-cli db:migrate && sequelize-cli db:seed:all",
    "db:status": "sequelize-cli db:migrate:status",
    "db:pull:hr": "sequelize-auto -h localhost -d hr_db_batch35 -u postgres -x admin -p 5432 -e postgres -o ./src/shared/utils/models/hr -s hr --sg --cls"
  },
```



```bash
npm run db:migrate
```

```bash
npm run db:migrate:undo
```

### Install Redis

```bash
docker run -d --name redis-local -p 6379:6379 redis:alpine
```



### Challanges
#### 1. Pastikan REST-API untuk Department & Auth bisa Running.