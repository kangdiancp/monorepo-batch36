'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Menggunakan RAW SQL INSERT dengan parameterized query (replacements) agar rapi dan aman
    await queryInterface.sequelize.query(`
      INSERT INTO account.permissions (
        permission_id, permission_code, module, action, description, created_at
      ) VALUES 
      (gen_random_uuid(), :p1_code, :p1_mod, :p1_act, :p1_desc, CURRENT_TIMESTAMP),
      (gen_random_uuid(), :p2_code, :p2_mod, :p2_act, :p2_desc, CURRENT_TIMESTAMP),
      (gen_random_uuid(), :p3_code, :p3_mod, :p3_act, :p3_desc, CURRENT_TIMESTAMP),
      (gen_random_uuid(), :p4_code, :p4_mod, :p4_act, :p4_desc, CURRENT_TIMESTAMP),
      (gen_random_uuid(), :p5_code, :p5_mod, :p5_act, :p5_desc, CURRENT_TIMESTAMP);
    `, {
      replacements: {
        // Data 1: Read Users
        p1_code: 'user:read',
        p1_mod: 'users',
        p1_act: 'read',
        p1_desc: 'Mengizinkan user untuk melihat daftar pengguna (Get All Users)',

        // Data 2: Create/Write Users
        p2_code: 'user:write',
        p2_mod: 'users',
        p2_act: 'write',
        p2_desc: 'Mengizinkan user untuk menambah pengguna baru (Signup/Register)',

        // Data 3: Read Roles
        p3_code: 'role:read',
        p3_mod: 'roles',
        p3_act: 'read',
        p3_desc: 'Mengizinkan melihat daftar role/jabatan sistem',

        // Data 4: Write Roles
        p4_code: 'role:write',
        p4_mod: 'roles',
        p4_act: 'write',
        p4_desc: 'Mengizinkan membuat atau mengubah role beserta permission-nya',

        // Data 5: Audit Logs View
        p5_code: 'audit:read',
        p5_mod: 'audit_logs',
        p5_act: 'read',
        p5_desc: 'Mengizinkan melihat log aktivitas sistem/keamanan'
      },
      type: Sequelize.QueryTypes.INSERT
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback seeder menggunakan RAW SQL DELETE berdasarkan kode permission yang di-insert
    await queryInterface.sequelize.query(`
      DELETE FROM account.permissions 
      WHERE permission_code IN (:codes);
    `, {
      replacements: {
        codes: ['user:read', 'user:write', 'role:read', 'role:write', 'audit:read']
      },
      type: Sequelize.QueryTypes.DELETE
    });
  }
};