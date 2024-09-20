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

-- Take-off table (populates when a user uploads a take-off)
CREATE TABLE takeoffs (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64),
  isArchived TINYINT(1) DEFAULT 0,
  creator_id INT,
  owner VARCHAR(64),
  owner_billing_address VARCHAR(64),
  file_path_of_plans VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (creator_id) REFERENCES users(id),
  PRIMARY KEY (id)
);
-- Labor table
CREATE TABLE labor (
  id INT NOT NULL AUTO_INCREMENT,
  rate_name VARCHAR(64),
  rate DECIMAL(10,2),
  PRIMARY KEY (id)
);

-- Material archetypes table
CREATE TABLE material_archetypes (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255),
  PRIMARY KEY (id)
);




-- Materials table
CREATE TABLE materials (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255),
  description VARCHAR(255),
  cost DECIMAL(10,2),
  takeoff_id INT,
  material_type INT,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id),
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

  -- associated revu data 
  name VARCHAR(255),
  labels VARCHAR(255),
  page_label VARCHAR(255),
  `date` DATETIME,
  layer VARCHAR(255),
  color VARCHAR(7),
  `length` DECIMAL(10, 4),
  length_unit VARCHAR(50),
  area DECIMAL(10, 2),
  area_unit VARCHAR(50),
  wall_area DECIMAL(10, 2),
  wall_area_unit VARCHAR(50),
  depth DECIMAL(10, 2),
  depth_unit VARCHAR(50),
  count INT,
  measurement DECIMAL(10, 2),
  measurement_unit VARCHAR(50),
  cost_delta DECIMAL(10, 2),

  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

CREATE TABLE estimate (
  id INT NOT NULL AUTO_INCREMENT,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  header TEXT,
  materials TEXT,
  labor TEXT,
  exclusions TEXT,
  footer TEXT,
  PRIMARY KEY (id)
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

