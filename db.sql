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

CREATE TABLE system_settings (
  levens_threshold INT,
  
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
  status TINYINT(1) DEFAULT 0,
  duration_hours INT,
  start_data DATETIME,
  end_data DATETIME,
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

insert into labor (rate_name, rate) values ('Rate USD/sqft', 1.56);
insert into labor (rate_name, rate) values ('hourly rate USD/hr', 22.00);
insert into labor (rate_name, rate) values ('Rate USD/ft', 1.04);



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
  name VARCHAR(255),
  description VARCHAR(255),
  cost DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  coverage DECIMAL(10,2),
  material_type INT,
  PRIMARY KEY (id),
  FOREIGN KEY (material_type) REFERENCES material_archetypes(id)
);

-- insert random paint names with id 6
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('PM 200 FL EXTRA', 'Paint 1 Description', 23.98, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('PM 200 0 EG EXTRA', 'Paint 2 Description', 24.98, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('PM 200 0 SG EXTRA', 'Paint 3 Description', 25.98, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('SPR INT FL EXTRA', 'Paint 4 Description', 33.66, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('SPR INT SA EXTRA', 'Paint 5 Description', 33.06, 1.00, 6); 

INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('SPR INT SG EXTRA', 'Paint 2 Description', 36.26, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('CASHMERE FL EXTRA', 'Paint 3 Description', 36.99, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('CASHMERE LL EXTRA', 'Paint 4 Description', 36.99, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('CASHMERE ML EXTRA', 'Paint 5 Description', 43.99, 1.00, 6); 

INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('DUR HOME FL EXTRA', 'Paint 5 Description', 49.64, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('DUR HOME MT EXTRA', 'Paint 5 Description', 49.64, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('DUR HOME SA EXTRA', 'Paint 5 Description', 48.99, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('DUR HOME SG EXTRA', 'Paint 5 Description', 51.99, 1.00, 6); 
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('EMERALD IN FL EXTR ', 'Other 4 Description', 53.51 , 1.00, 6);
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('EMERALD IN SA EXTR', 'Other 4 Description', 54.51 , 1.00, 6);
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('EMERALD IN SG EXTR', 'Other 4 Description', 55.51 , 1.00, 6);
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('PROCL LTX SA EXTRA', 'Other 4 Description', 54.85, 1.00, 6);
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('PROCL LTX SG EXTRA', 'Other 4 Description', 56.55, 1.00, 6);
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('EMRLD UTE SA HHW', 'Other 4 Description', 62.05, 1.00, 6);
INSERT INTO materials (name, description, cost, coverage, material_type) VALUES ('FIRETEX FX5090', 'Other 1 Description', 98.39, 1.00, 6); 



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
  primary_cost_delta DECIMAL(10,2),
  secondary_material_id INT,
  secondary_cost_delta DECIMAL(10,2),
  tertiary_material_id INT,
  tertiary_cost_delta DECIMAL(10,2),
  quartary_material_id INT,
  quartary_cost_delta DECIMAL(10,2),
  labor_id INT,
  applied TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (secondary_material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (tertiary_material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (labor_id) REFERENCES labor(id) ON DELETE CASCADE
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


