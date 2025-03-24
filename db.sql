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
INSERT INTO user_types (title) VALUES ('Admin'), ('User'), ('subcontractor');

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

-- Default admin user
INSERT INTO users (user_type, name, email, phone_number) VALUES (1, "Johnny","lindberghjohnny@gmail.com", "+14342491362");

-- System settings table
CREATE TABLE system_settings (
  setting_id INT NOT NULL AUTO_INCREMENT,
  setting_name VARCHAR(64) NOT NULL,
  setting_value TEXT NOT NULL,
  PRIMARY KEY (setting_id)
);

CREATE TABLE payment_methods (
  id INT NOT NULL AUTO_INCREMENT,
  method VARCHAR(64) NOT NULL UNIQUE,
  PRIMARY KEY (id)
);

INSERT INTO payment_methods (method) VALUES ('card'), ('us_bank_account');

-- Default settings
INSERT INTO system_settings (setting_name, setting_value) 
VALUES 
  ('default_labor_cost', '0.40'),
  ('levens_threshold', '2'),
  ('chatgpt_prompt', "Consider the following json object. The output must be two description sections titled 'Proposal Includes' and 'Exclusions and assumptions' separated by a </br> tag. If an object has no selected materials, its name is stated in the 'Exclusions and assumptions' section; otherwise, a one-sentence description in the 'Proposal Includes' section that includes the name. \n."),
  ('sales_tax', '5.3');

-- Customers table
CREATE TABLE customers (
  id INT NOT NULL AUTO_INCREMENT, -- QB ID
  taxable TINYINT(1) DEFAULT 1,
  job BOOLEAN NOT NULL DEFAULT 0,
  givenName VARCHAR(100),
  billing_address VARCHAR(255),
  CompanyName VARCHAR(255),
  isArchived BOOLEAN DEFAULT 0,
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
  date_last_shared TIMESTAMP,
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
  signed_at TIMESTAMP,
  view_count INT DEFAULT 0,
  total DECIMAL(10,2),
  travel_cost DECIMAL(10,2) DEFAULT 0.00,
  tax DECIMAL(10,2) DEFAULT 5.3,
  labor_cost DECIMAL(10,2) DEFAULT 0.00,
  labor_rate DECIMAL(10,2) DEFAULT 25.00,
  material_cost DECIMAL(10,2),
  material_markup DECIMAL(10,2) DEFAULT 0.30, 
  labor_markup DECIMAL(10,2) DEFAULT 0.40, 
  touchups_cost DECIMAL(10,2) DEFAULT 0.00,
  supervisor_markup DECIMAL(10,2) DEFAULT 0.03,
  profit DECIMAL(10,2) DEFAULT 0.00,
  misc_materials_cost DECIMAL(10,2) DEFAULT 0.00,
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
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  PRIMARY KEY (id)
);

-- example insert
-- INSERT INTO takeoffs (name, creator_id, file_path_of_plans, status, hash, total, travel_cost, tax, labor_cost, labor_rate, material_cost, material_markup, labor_markup, supervisor_markup, payment_method, duration_hours, start_date, end_date, last_updated_by, customer_id) VALUES ('Takeoff 1', 1, 'path/to/plans', 0, 'hash1', 2000.00, 0.00, 5.3, 0.00, 25.00, 0.00, 0.30, 0.40, 0.03, 'card', 40, '2022-01-01 00:00:00', '2022-01-31 00:00:00', 1, 1);
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
  labor_cost DECIMAL(10,2),
  material_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2), -- computed server-side
  created_by INT,
  applied TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
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
  qb_number VARCHAR(64),
  invoice_name VARCHAR(64),
  hash VARCHAR(64),
  takeoff_id INT NOT NULL,
  total DECIMAL(10,2),
  invoice_payment_method VARCHAR(64),
  status TINYINT(1) DEFAULT 0,
  payment_confirmation_email_sent TINYINT(1) DEFAULT 0,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE
);

CREATE TABLE invoice_items (
  id INT NOT NULL AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  description VARCHAR(64),
  PRIMARY KEY (id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- example insert 
-- INSERT INTO invoice_items (invoice_id, cost, quantity, description) VALUES (1, 2000.00, 1, 'Description 1');

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

CREATE TABLE change_orders (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
  name VARCHAR(64),
  description TEXT,
  qb_number INT,
  co_number INT,
  hash VARCHAR(64),
  -- 0 unapproved, 1 approved, 2 approved by creator, 
  status TINYINT(1) DEFAULT 0,
  require_client_approval TINYINT DEFAULT 0,
  -- client-agreement 0 not approved, 1 approved
  change_order_total DECIMAL(10,2),
  payment_confirmation_email_sent TINYINT(1) DEFAULT 0,
  due_date TIMESTAMP,
  last_viewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE
);

-- INSERT INTO change_orders (takeoff_id, name, description, qb_number, co_number, hash, change_order_total) VALUES (1, 'Change Order 1', 'Description 1', 1234, 1, 'hash1', 2000.00);



CREATE TABLE change_order_items (
  id INT NOT NULL AUTO_INCREMENT,
  change_order_id INT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2),
  quantity INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (change_order_id) REFERENCES change_orders(id) ON DELETE CASCADE
);

-- INSERT INTO change_order_items (change_order_id, description, cost, quantity) VALUES (1, 'Description 1', 2000.00, 1);

-- stores the relationship between invoices and change orders
-- an invoice can have multiple change orders
CREATE TABLE invoice_change_orders (
  id INT NOT NULL AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  change_order_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (change_order_id) REFERENCES change_orders(id) ON DELETE CASCADE
);

-- example insert
-- INSERT INTO invoice_change_orders (invoice_id, change_order_id) VALUES (1, 1);



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
  -- a hyper link to the material's datasheet
  datasheet VARCHAR(255),
  PRIMARY KEY (id),
  FOREIGN KEY (material_type) REFERENCES material_archetypes(id) ON DELETE CASCADE
);

SOURCE materials.db.sql;

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
  notes TEXT,
  measurement DECIMAL(10,2),
  measurement_unit VARCHAR(64),
  color VARCHAR(64),
  top_coat INT NOT NULL,
  primer INT,
  cost_delta DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0.40,
  applied TINYINT(1) DEFAULT 1,
  separate_line_item TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE SET NULL
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


-- Forms Table
CREATE TABLE forms (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT, -- Add user_id directly to relate forms to users
  form_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- example insert
INSERT INTO forms (user_id, form_name) VALUES (1, 'Form 1');

-- Subcontractor Forms Table
CREATE TABLE subcontractor_forms (
  id INT NOT NULL AUTO_INCREMENT,
  form_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY (form_id, user_id), -- Prevent duplicate assignments
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- example insert
INSERT INTO subcontractor_forms (form_id, user_id) VALUES (1, 1);

-- Form Items Table
CREATE TABLE form_items (
  id INT NOT NULL AUTO_INCREMENT,
  form_id INT NOT NULL,
  job_name VARCHAR(255) NOT NULL, -- Job
  job_id VARCHAR(64), -- Job ID (made nullable for flexibility)
  item_description VARCHAR(255), -- Description (made nullable for flexibility)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

CREATE TABLE form_bid (
  id INT NOT NULL AUTO_INCREMENT,
  form_id INT NOT NULL,
  job_name VARCHAR(255) NOT NULL, -- Job
  bid DECIMAL(10,2),
  request DECIMAL(10,2),
  PRIMARY KEY (id),
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);

INSERT INTO form_bid (form_id, job_name, bid, request) VALUES (1, 'Job 1', 20000.00, 1200.00);
-- example insert
INSERT INTO form_items (form_id, job_name, item_description) VALUES (1, 'Job 1', 'Description 1');

INSERT INTO form_items (form_id, job_name, item_description) VALUES (1, 'Job 2', 'Description 2');


-- Form Item Days Table
CREATE TABLE form_item_days (
  id INT NOT NULL AUTO_INCREMENT,
  form_item_id INT NOT NULL,
  day ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL, -- Use ENUM for days
  duration DECIMAL(10,3), -- Add duration field to capture time spent, max value of 24 hours
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (form_item_id) REFERENCES form_items(id) ON DELETE CASCADE
);

-- example inserts for each day of the week
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (1, 'Monday', 8.5);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (1, 'Tuesday', 6.1);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (1, 'Wednesday', 4.5);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (1, 'Thursday', 8.11);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (1, 'Friday', 8.422);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (1, 'Saturday', 2.55);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (1, 'Sunday', 0);


INSERT INTO form_item_days (form_item_id, day, duration) VALUES (2, 'Monday', 7.3);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (2, 'Tuesday', 5.2);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (2, 'Wednesday', 6.8);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (2, 'Thursday', 4.9);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (2, 'Friday', 7.1);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (2, 'Saturday', 3.6);
INSERT INTO form_item_days (form_item_id, day, duration) VALUES (2, 'Sunday', 1.2);



CREATE TABLE sov (
  id INT NOT NULL AUTO_INCREMENT,
  takeoff_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  hash VARCHAR(64) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (takeoff_id) REFERENCES takeoffs(id) ON DELETE CASCADE
);

-- example insert

INSERT INTO sov (takeoff_id, name, total, hash) VALUES (1, 'SOV 1', 2000.00, 'lh2489sfuyfu2434879');


CREATE TABLE sov_items (
  id INT NOT NULL AUTO_INCREMENT,
  sov_id INT NOT NULL,
  invoice_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  total_contracted_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (sov_id) REFERENCES sov(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- example insert 
INSERT INTO sov_items (sov_id, invoice_id, description, cost, quantity, total, total_contracted_amount) VALUES (1, 2, 'Description 1', 200.00, 1, 200.00, 2000.00);
INSERT INTO sov_items (sov_id, invoice_id, description, cost, quantity, total, total_contracted_amount) VALUES (1, 2, 'Description 2', 250.00, 10, 2500.00, 5000.00);