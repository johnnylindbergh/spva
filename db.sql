DROP DATABASE IF EXISTS spvaTrack;
CREATE DATABASE spvaTrack;

USE spvaTrack;

-- User roles table
CREATE TABLE user_types (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64),
  PRIMARY KEY (id)
);

-- Pre-populate user roles
INSERT INTO user_types (title) VALUES ('Admin'), ('User');

-- Users table
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  user_type INT DEFAULT 2,
  name VARCHAR(64),
  email VARCHAR(64) NOT NULL UNIQUE,
  phone_number VARCHAR(12) NULL UNIQUE,
  public_key VARCHAR(64),
  authentication_token VARCHAR(64),
  isArchived TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_type) REFERENCES user_types(id),
  PRIMARY KEY (id)
);
-- exmaple entry for settings table: 
CREATE TABLE system_settings (
  setting_id INT NOT NULL AUTO_INCREMENT, 
  setting_name VARCHAR(64),
  setting_value VARCHAR(64),
  PRIMARY KEY (setting_id)
);
-- actual defaults
INSERT INTO system_settings (setting_name, setting_value) VALUES ('default_labor_cost', '0.40');
INSERT INTO system_settings (setting_name, setting_value) VALUES ('levens_threshold', '2');
INSERT INTO system_settings (setting_name, setting_value) VALUES ('chatgpt_prompt', 'Default prompt goes here');

INSERT INTO system_settings (setting_name, setting_value) VALUES ('default_labor_cost', '0.00');
INSERT INTO system_settings (setting_name, setting_value) VALUES ('levens_threshold', '2'); 
INSERT INTO system_settings (setting_name, setting_value) VALUES ('chatgpt_prompt', 'Default prompt goes here');



CREATE TABLE estimate (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT,
  isArchived TINYINT(1) DEFAULT 0,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  inclusions TEXT,
  options TEXT,
  labor TEXT,
  exclusions TEXT,
  footer TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE options (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT,
  description TEXT,
  cost DECIMAL(10,2),
  applied TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id)
);

-- Take-off table (populates when a user uploads a take-off)
CREATE TABLE takeoffs (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) default 'Untitled',
  isArchived TINYINT(1) DEFAULT 0,
  creator_id INT,
  owner VARCHAR(64) default 'Owner Name',
  owner_billing_address VARCHAR(64),
  owner_email VARCHAR(64),
  file_path_of_plans VARCHAR(255),
  estimate_id INT,
  status TINYINT(1) DEFAULT 0,
  passcode VARCHAR(64),
  view_count INT DEFAULT 0,
  total DECIMAL(10,2),
  duration_hours INT,
  start_date DATETIME,
  end_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (estimate_id) REFERENCES estimate(id),
  PRIMARY KEY (id)
);


-- seperate owner table
CREATE TABLE owners (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64),
  billing_address VARCHAR(64),
  email VARCHAR(64),
  phone_number VARCHAR(12),
  PRIMARY KEY (id)
);




-- Material archetypes table
CREATE TABLE material_archetypes (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255),
  PRIMARY KEY (id)
);

INSERT INTO material_archetypes (name) VALUES ('Wood'), ('Metal'), ('Plastic'), ('Masonry'), ('Drywall'), ('Paint'), ('Tile'), ('Carpet'), ('Roofing'), ('Insulation'), ('Electrical'), ('Plumbing'), ('HVAC'), ('Other');



-- Materials table
CREATE TABLE materials (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) UNIQUE,
  description VARCHAR(255),
  cost DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  coverage DECIMAL(10,2),
  material_type INT,
  PRIMARY KEY (id),
  FOREIGN KEY (material_type) REFERENCES material_archetypes(id)
);



-- Estimates table (job estimation data)
CREATE TABLE subjects (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT,
  material_id INT,
  total_cost DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  materials_cost DECIMAL(10,2),
  duration_hours INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subject VARCHAR(64),
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  page_label VARCHAR(64),
  layer VARCHAR(64),
  color VARCHAR(64),
  measurement DECIMAL(10,2),
  measurement_unit VARCHAR(64), 

  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL

);

CREATE TABLE applied_materials (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64),
  measurement DECIMAL(10,2),
  measurement_unit VARCHAR(64),
  takeoff_id INT,

  material_id INT,
  secondary_material_id INT,
  tertiary_material_id INT,
  quartary_material_id INT,
  
  primary_cost_delta DECIMAL(10,2)  NOT NULL DEFAULT 0,
  secondary_cost_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  tertiary_cost_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  quartary_cost_delta DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  labor_cost DECIMAL(10,2) NOT NULL default 0.40,
  applied TINYINT(1) DEFAULT 1,

  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (secondary_material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (tertiary_material_id) REFERENCES materials(id) ON DELETE CASCADE
);


CREATE TABLE string_match_subject (
  id INT NOT NULL AUTO_INCREMENT,
  material_id INT,
  labor_cost DECIMAL(10,2),
  unit_cost DECIMAL(10,2),
  string_match VARCHAR(64),
  PRIMARY KEY (id),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);




-- Emails table
CREATE TABLE emails (
  id INT NOT NULL AUTO_INCREMENT,
  sender_id INT,
  sender VARCHAR(64),
  customer_takeoff_id INT,
  first_opened TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_opened TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (customer_takeoff_id) REFERENCES takeoffs(id)
);

