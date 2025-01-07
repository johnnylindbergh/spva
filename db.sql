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
  setting_value TEXT,
  PRIMARY KEY (setting_id)
);



-- actual defaults
INSERT INTO system_settings (setting_name, setting_value) VALUES ('default_labor_cost', '0.40');
INSERT INTO system_settings (setting_name, setting_value) VALUES ('levens_threshold', '2');
INSERT INTO system_settings (setting_name, setting_value) VALUES ('chatgpt_prompt', "Consider the following json object. The output must be two description sections titled 'Proposal Includes' and 'Exclusions and assumptions' separated by a </br> tag. If an object has no selected materials, its name is listed in the 'Exclusions and assumptions' section; otherwise, a one-sentence description in the 'Proposal Includes' section that includes the name. \n. Do not include extra symbols like (* or -)");
INSERT INTO system_settings (setting_name, setting_value) VALUES ('sales_tax', '5.3');

CREATE TABLE estimate (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT,
  signed_total DECIMAL(10,2),
  isArchived TINYINT(1) DEFAULT 0,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  inclusions TEXT,
  labor TEXT,
  exclusions TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE options (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT,
  description TEXT,
  cost DECIMAL(10,2),
  applied TINYINT(1) DEFAULT 1,
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
  invoice_email VARCHAR(64),
  file_path_of_plans VARCHAR(255),
  estimate_id INT UNIQUE,
  status TINYINT(1) DEFAULT 0,
  hash VARCHAR(64),
  view_count INT DEFAULT 0,
  total DECIMAL(10,2),
  tax DECIMAL(10,2) DEFAULT 5.3,
  payment_method VARCHAR(64),
  duration_hours INT,
  start_date DATETIME,
  end_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_updated_by INT,


  FOREIGN KEY (creator_id) REFERENCES users(id),
  FOREIGN KEY (estimate_id) REFERENCES estimate(id),
  FOREIGN KEY (last_updated_by) REFERENCES users(id),
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

-- statements table
-- statement are a static list of statements that HAVE been shared with the customer
 
CREATE TABLE statements (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT,
  total DECIMAL(10,2),
  price_paid DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id)
);
-- invoices table
-- a list of invoices that HAVE been shared with the customer
CREATE TABLE invoices (
  id INT NOT NULL AUTO_INCREMENT,
  invoice_number VARCHAR(64),
  hash varchar(64),
  takeoff_id INT,
  total DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id)
);

-- payment history table
-- a complete list of all payments made by the customer
CREATE TABLE payment_history (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT,
  invoice_id INT,
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  PRIMARY KEY (id)
);
-- example payment_history entry
INSERT INTO payment_history (takeoff_id, amount) VALUES (1, 100.00);





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
  separate_line_item TINYINT(1) DEFAULT 0,

  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (secondary_material_id) REFERENCES materials(id) ON DELETE CASCADE,
  FOREIGN KEY (tertiary_material_id) REFERENCES materials(id) ON DELETE CASCADE
);



CREATE TABLE string_match_subject (
  id INT NOT NULL AUTO_INCREMENT,
  type INT NOT NULL,
  material_id INT,
  labor_cost DECIMAL(10,2),
  unit_cost DECIMAL(10,2),
  string_match VARCHAR(128),
  PRIMARY KEY (id),
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);





  -- Emails table
  CREATE TABLE emails (
    id INT NOT NULL AUTO_INCREMENT,
    takeoff_id INT,
    sender_id INT,
    recipient_email VARCHAR(64),
    type VARCHAR(64),
    response VARCHAR(128),
    first_opened TIMESTAMP,
    last_opened TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );
  