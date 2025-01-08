INSERT INTO customers (
    id,
    Taxable,
    BillAddr_Id,
    BillAddr_Line1,
    BillAddr_City,
    BillAddr_CountrySubDivisionCode,
    BillAddr_Country,
    BillAddr_PostalCode,
    BillAddr_Lat,
    BillAddr_Long,
    ShipAddr_Id,
    ShipAddr_Line1,
    ShipAddr_City,
    ShipAddr_CountrySubDivisionCode,
    ShipAddr_Country,
    ShipAddr_PostalCode,
    ShipAddr_Lat,
    ShipAddr_Long,
    Job,
    BillWithParent,
    ParentRef_Value,
    Level,
    Balance,
    BalanceWithJobs,
    CurrencyRef_Value,
    CurrencyRef_Name,
    PreferredDeliveryMethod,
    Domain,
    Sparse,
    SyncToken,
    MetaData_CreateTime,
    MetaData_LastUpdatedTime,
    GivenName,
    MiddleName,
    FamilyName,
    FullyQualifiedName,
    CompanyName,
    DisplayName,
    PrintOnCheckName,
    Active,
    PrimaryPhone_FreeFormNumber,
    Mobile_FreeFormNumber,
    PrimaryEmailAddr_Address,
    WebAddr_URI
)
VALUES (
    1,               -- id (int, NOT NULL, primary key)
    1,               -- Taxable (tinyint(1), NOT NULL)
    101,             -- BillAddr_Id
    '123 Main St',   -- BillAddr_Line1
    'New York',      -- BillAddr_City
    'NY',            -- BillAddr_CountrySubDivisionCode (char(2))
    'USA',           -- BillAddr_Country
    '10001',         -- BillAddr_PostalCode
    '40.7128',       -- BillAddr_Lat
    '-74.0060',      -- BillAddr_Long
    201,             -- ShipAddr_Id
    '456 Broadway',  -- ShipAddr_Line1
    'New York',      -- ShipAddr_City
    'NY',            -- ShipAddr_CountrySubDivisionCode (char(2))
    'USA',           -- ShipAddr_Country
    '10002',         -- ShipAddr_PostalCode
    '40.7130',       -- ShipAddr_Lat
    '-74.0070',      -- ShipAddr_Long
    0,               -- Job (tinyint(1), NOT NULL)
    0,               -- BillWithParent (tinyint(1), NOT NULL)
    NULL,            -- ParentRef_Value
    NULL,            -- Level
    100.00,          -- Balance (decimal(10,2), NOT NULL)
    100.00,          -- BalanceWithJobs (decimal(10,2), NOT NULL)
    'USD',           -- CurrencyRef_Value (char(3))
    'US Dollar',     -- CurrencyRef_Name
    'Email',         -- PreferredDeliveryMethod
    'QBO',           -- Domain
    0,               -- Sparse (tinyint(1), NOT NULL)
    '1',             -- SyncToken
    NOW(),           -- MetaData_CreateTime
    NOW(),           -- MetaData_LastUpdatedTime
    'John',          -- GivenName
    'A.',            -- MiddleName
    'Doe',           -- FamilyName
    'John A. Doe',   -- FullyQualifiedName
    'JD Inc.',       -- CompanyName
    'John Doe',      -- DisplayName
    'John Doe',      -- PrintOnCheckName
    1,               -- Active (tinyint(1), NOT NULL)
    '555-1234',      -- PrimaryPhone_FreeFormNumber
    '555-5678',      -- Mobile_FreeFormNumber
    'johndoe@example.com', -- PrimaryEmailAddr_Address
    'https://example.com'  -- WebAddr_URI
);