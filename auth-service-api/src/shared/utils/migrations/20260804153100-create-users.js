'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
     `
     CREATE TABLE account.test_permission (
            pms_id   UUID          DEFAULT gen_random_uuid() NOT NULL,
            pms_code VARCHAR(100)  NOT NULL,   
            module          VARCHAR(50)   NOT NULL,   
            action  VARCHAR(50)   NOT NULL,   
            description VARCHAR(255),
            created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
            CONSTRAINT pk_pms       PRIMARY KEY (pms_id),
            CONSTRAINT uq_pms_code  UNIQUE (pms_code)
          );
        
     `   
    );
  },

  async down (queryInterface, Sequelize) {
      await queryInterface.sequelize.query(`drop table account.test_permission`);
  }
};
