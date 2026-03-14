# Local Development Setup

Follow these steps to set up and run the User Management API on your local machine.

## Prerequisites
- Node.js (v14 or higher)
- npm
- PostgreSQL 18 (or your configured database)

## Setup Instructions

1. **Verify PostgreSQL Service is Running on Port 5532**
   ```bash
   netstat -ano | findstr :5532
   ```
   
   **If PostgreSQL is NOT running on port 5532:**
   
   - **Stop the PostgreSQL service** (Windows):
     ```bash
     net stop postgresql-x64-18
     ```
     *(Replace version number if different, e.g., postgresql-x64-14)*

   - **To change PostgreSQL port:**
     - Open PostgreSQL config file: `C:\Program Files\PostgreSQL\18\data\postgresql.conf`
     - Find the line `#port = 5432` and change it to `port = 5532`
     - Save the file and restart the service (see command below)

   - **Restart the PostgreSQL service**:
     ```bash
     net start postgresql-x64-18
     ```
   
2. **Verify PostgreSQL Password**
   Before setting up the environment, verify your PostgreSQL password:
   ```bash
   psql -U postgres -p 5532
   ```
   When prompted, enter your PostgreSQL password. Note this password for the next step.

3. **Create environment file**
   Create a `.env` file in the `node/database/postgres/` directory with the following variables:
   
   **IMPORTANT**: Replace `YOUR_POSTGRES_PASSWORD` with the password you verified above.
  
   ```bash
   DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5532/testdb"
   NODE_ENV="development"
   PORT=3000
   ```

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Run Prisma migrations**
   ```bash
   npx prisma migrate dev --name init
   ```

6. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

7. **Start the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

## Testing the API

### Using Postman

Test the following endpoints using Postman:

- **POST** `/api/users` - Create a new user
- **PUT** `/api/users/:id` - Update an existing user
- **DELETE** `/api/users/:id` - Delete a user

### Using Web Client

- **GET** `/api/users` - Retrieve all users
- **GET** `/api/users/:id` - Retrieve a specific user

## Ports & Addresses

| Service | Port | Address | Connection String |
|---------|------|---------|-------------------|
| Node.js API | 3000 | `http://localhost:3000` | N/A |
| PostgreSQL | 5532 | `localhost:5532` | `postgresql://postgres:PASSWORD@localhost:5532/testdb` |

## Troubleshooting

- **Migration issues**: Ensure your database URL is correct and the database exists
- **Port already in use**: Change the PORT variable in `.env`
- **Connection refused on port 5532**: Verify PostgreSQL service is running (see Setup step 1)
- **Prisma client not found**: Run `npx prisma generate`
- **Module not found**: Run `npm install`

## License

MIT
