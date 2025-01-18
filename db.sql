-- Drop and create the database
DROP DATABASE IF EXISTS spvaTrack;
CREATE DATABASE spvaTrack;

USE spvaTrack;

-- User roles table
CREATE TABLE user_types (
  id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(64) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

-- Pre-populate user roles
INSERT INTO user_types (title) VALUES ('Admin'), ('User');

-- Users table
CREATE TABLE users (
  id INT NOT NULL AUTO_INCREMENT,
  user_type INT DEFAULT 2,
  name VARCHAR(64) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone_number VARCHAR(20) NULL UNIQUE,
  public_key VARCHAR(64),
  authentication_token VARCHAR(64),
  isArchived TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_type) REFERENCES user_types(id),
  PRIMARY KEY (id)
);

-- System settings table
CREATE TABLE system_settings (
  setting_id INT NOT NULL AUTO_INCREMENT,
  setting_name VARCHAR(64) NOT NULL,
  setting_value TEXT NOT NULL,
  PRIMARY KEY (setting_id)
);

-- Default settings
INSERT INTO system_settings (setting_name, setting_value) 
VALUES 
  ('default_labor_cost', '0.40'),
  ('levens_threshold', '2'),
  ('chatgpt_prompt', "Consider the following json object. The output must be two description sections titled 'Proposal Includes' and 'Exclusions and assumptions' separated by a </br> tag. If an object has no selected materials, its name is listed in the 'Exclusions and assumptions' section; otherwise, a one-sentence description in the 'Proposal Includes' section that includes the name. \n. Do not include extra symbols like (* or -)"),
  ('sales_tax', '5.3');

-- Customers table
CREATE TABLE customers (
  id INT NOT NULL, -- QB ID
  taxable BOOLEAN NOT NULL DEFAULT 1,
  givenName VARCHAR(100),
  FullyQualifiedName VARCHAR(255),
  owner_billing_address VARCHAR(255),
  CompanyName VARCHAR(255),
  DisplayName VARCHAR(255),
  isArchived TINYINT(1) DEFAULT 0,
  phone VARCHAR(20),
  primary_email_address VARCHAR(255),
  invoice_email_address VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Estimates table
CREATE TABLE estimates (
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

-- Takeoffs table
CREATE TABLE takeoffs (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(64) DEFAULT 'Untitled',
  isArchived TINYINT(1) DEFAULT 0,
  creator_id INT NOT NULL,
  file_path_of_plans VARCHAR(255),
  estimate_id INT UNIQUE,
  status TINYINT(1) DEFAULT 0,
  hash VARCHAR(64),
  view_count INT DEFAULT 0,
  total DECIMAL(10,2),
  tax DECIMAL(10,2), -- Default value to be set by application logic
  payment_method VARCHAR(64),
  duration_hours INT,
  start_date DATETIME,
  end_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_updated_by INT,
  customer_id INT,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE SET NULL,
  FOREIGN KEY (last_updated_by) REFERENCES users(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  PRIMARY KEY (id)
);

-- Customer-Takeoff relationship table
CREATE TABLE customer_takeoffs (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
  customer_id INT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Options table
CREATE TABLE options (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2),
  applied TINYINT(1) DEFAULT 1,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE
);

-- Statements table
CREATE TABLE statements (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
  hash VARCHAR(64),
  statement_name VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE invoices (
  id INT NOT NULL AUTO_INCREMENT,
  invoice_number VARCHAR(64) NOT NULL,
  invoice_name VARCHAR(64),
  hash VARCHAR(64),
  takeoff_id INT NOT NULL,
  total DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE
);

-- Payment history table
CREATE TABLE payment_history (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
  invoice_id INT NOT NULL,
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Material archetypes table
CREATE TABLE material_archetypes (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

-- Populate material archetypes
INSERT INTO material_archetypes (name) VALUES ('Wood'), ('Metal'), ('Plastic'), ('Masonry'), ('Drywall'), ('Paint'), ('Tile'), ('Carpet'), ('Roofing'), ('Insulation'), ('Electrical'), ('Plumbing'), ('HVAC'), ('Other');

-- Materials table
CREATE TABLE materials (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description VARCHAR(255),
  cost DECIMAL(10,2),
  labor_cost DECIMAL(10,2),
  coverage DECIMAL(10,2),
  material_type INT NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (material_type) REFERENCES material_archetypes(id) ON DELETE CASCADE
);

-- Subjects table
CREATE TABLE subjects (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
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
  top_coat INT,
  primer INT,
  measurement_unit VARCHAR(64),
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
);

-- Applied materials table
CREATE TABLE applied_materials (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
  material_id INT,
  name VARCHAR(64) NOT NULL,
  measurement DECIMAL(10,2),
  measurement_unit VARCHAR(64),
  top_coat INT,
  primer INT,
  cost_delta DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0.40,
  applied TINYINT(1) DEFAULT 1,
  separate_line_item TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- Emails table
CREATE TABLE emails (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
  sender_id INT NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  type VARCHAR(64) NOT NULL,
  response VARCHAR(128),
  first_opened TIMESTAMP,
  last_opened TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
