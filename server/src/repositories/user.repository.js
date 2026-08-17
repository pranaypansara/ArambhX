import pool from '../config/db.js';

class UserRepository {
  // Find user by email
  async findByEmail(email) {
    const query = {
      text: 'SELECT * FROM users WHERE email = $1;',
      values: [email.toLowerCase().trim()]
    };
    const { rows } = await pool.query(query);
    return rows[0] || null;
  }

  // Find user by ID (excluding password)
  async findById(id) {
    const query = {
      text: 'SELECT id, name, email, role, created_at AS "createdAt", updated_at AS "updatedAt" FROM users WHERE id = $1;',
      values: [id]
    };
    const { rows } = await pool.query(query);
    return rows[0] || null;
  }

  // Create a new user
  async create({ name, email, password, role }) {
    const query = {
      text: `
        INSERT INTO users (name, email, password, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, created_at AS "createdAt", updated_at AS "updatedAt";
      `,
      values: [name.trim(), email.toLowerCase().trim(), password, role || 'FACULTY']
    };
    const { rows } = await pool.query(query);
    return rows[0];
  }
}

export default new UserRepository();
