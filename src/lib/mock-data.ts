export interface Column {
  name: string;
  type: string;
  primary?: boolean;
}

export type ColumnValue = string | number | boolean | null;

export interface Table {
  id: string;
  name: string;
  rowCount: number;
  columns: Column[];
  rows: Record<string, ColumnValue>[];
}

export interface Database {
  tables: Table[];
  currentTable: string;
}

export const mockDatabase: Database = {
  currentTable: "categories",
  tables: [
    {
      id: "categories",
      name: "categories",
      rowCount: 8,
      columns: [
        { name: "id", type: "integer", primary: true },
        { name: "name", type: "varchar(15)" },
        { name: "description", type: "text" },
        { name: "id_products_category_id", type: "integer" },
      ],
      rows: [
        { id: 1, name: "Beverages", description: "Soft drinks, coffees, teas, beers, and ales", id_products_category_id: "id_products_category_id" },
        { id: 2, name: "Condiments", description: "Sweet and savory sauces, relishes, spreads, and seasonings", id_products_category_id: "id_products_category_id" },
        { id: 3, name: "Confections", description: "Desserts, candies, and sweet breads", id_products_category_id: "id_products_category_id" },
        { id: 4, name: "Dairy Products", description: "Cheeses", id_products_category_id: "id_products_category_id" },
        { id: 5, name: "Grains/Cereals", description: "Breads, crackers, pasta, and cereal", id_products_category_id: "id_products_category_id" },
        { id: 6, name: "Meat/Poultry", description: "Prepared meats", id_products_category_id: "id_products_category_id" },
        { id: 7, name: "Produce", description: "Dried fruit and bean curd", id_products_category_id: "id_products_category_id" },
        { id: 8, name: "Seafood", description: "Seaweed and fish", id_products_category_id: "id_products_category_id" },
      ],
    },
    {
      id: "customers",
      name: "customers",
      rowCount: 93,
      columns: [
        { name: "id", type: "integer", primary: true },
        { name: "company_name", type: "varchar(40)" },
        { name: "contact_name", type: "varchar(30)" },
        { name: "contact_title", type: "varchar(30)" },
      ],
      rows: [
        { id: 1, company_name: "Alfreds Futterkiste", contact_name: "Maria Anders", contact_title: "Sales Representative" },
        { id: 2, company_name: "Ana Trujillo Emparedados y helados", contact_name: "Ana Trujillo", contact_title: "Owner" },
        { id: 3, company_name: "Antonio Moreno Taquería", contact_name: "Antonio Moreno", contact_title: "Owner" },
      ],
    },
    {
      id: "employees",
      name: "employees",
      rowCount: 9,
      columns: [
        { name: "id", type: "integer", primary: true },
        { name: "last_name", type: "varchar(20)" },
        { name: "first_name", type: "varchar(10)" },
        { name: "title", type: "varchar(30)" },
      ],
      rows: [
        { id: 1, last_name: "Davolio", first_name: "Nancy", title: "Sales Representative" },
        { id: 2, last_name: "Fuller", first_name: "Andrew", title: "Vice President, Sales" },
        { id: 3, last_name: "Leverling", first_name: "Janet", title: "Sales Representative" },
      ],
    },
    {
      id: "order_details",
      name: "order_details",
      rowCount: 2155,
      columns: [
        { name: "order_id", type: "integer", primary: true },
        { name: "product_id", type: "integer", primary: true },
        { name: "unit_price", type: "decimal(10,2)" },
        { name: "quantity", type: "smallint" },
        { name: "discount", type: "real" },
      ],
      rows: [],
    },
    {
      id: "orders",
      name: "orders",
      rowCount: 830,
      columns: [
        { name: "id", type: "integer", primary: true },
        { name: "customer_id", type: "varchar" },
        { name: "employee_id", type: "integer" },
        { name: "order_date", type: "date" },
      ],
      rows: [],
    },
    {
      id: "products",
      name: "products",
      rowCount: 77,
      columns: [
        { name: "id", type: "integer", primary: true },
        { name: "name", type: "varchar(40)" },
        { name: "supplier_id", type: "integer" },
        { name: "category_id", type: "integer" },
      ],
      rows: [],
    },
    {
      id: "regions",
      name: "regions",
      rowCount: 4,
      columns: [
        { name: "id", type: "integer", primary: true },
        { name: "description", type: "varchar" },
      ],
      rows: [],
    },
    {
      id: "shippers",
      name: "shippers",
      rowCount: 3,
      columns: [
        { name: "id", type: "integer", primary: true },
        { name: "company_name", type: "varchar(40)" },
        { name: "phone", type: "varchar(24)" },
      ],
      rows: [],
    },
    {
      id: "suppliers",
      name: "suppliers",
      rowCount: 29,
      columns: [
        { name: "id", type: "integer", primary: true },
        { name: "company_name", type: "varchar(40)" },
        { name: "contact_name", type: "varchar(30)" },
        { name: "contact_title", type: "varchar(30)" },
      ],
      rows: [],
    },
    {
      id: "territories",
      name: "territories",
      rowCount: 53,
      columns: [
        { name: "id", type: "varchar(20)", primary: true },
        { name: "description", type: "varchar(50)" },
        { name: "region_id", type: "integer" },
      ],
      rows: [],
    },
    {
      id: "employee_territories",
      name: "employee_territories",
      rowCount: 49,
      columns: [
        { name: "employee_id", type: "integer", primary: true },
        { name: "territory_id", type: "varchar(20)", primary: true },
      ],
      rows: [],
    },
    {
      id: "customer_and_supplier_by_city",
      name: "customer_and_supplier_by_city",
      rowCount: 122,
      columns: [
        { name: "city", type: "varchar(15)" },
        { name: "company_name", type: "varchar(40)" },
        { name: "contact_name", type: "varchar(30)" },
        { name: "relationship", type: "varchar(9)" },
      ],
      rows: [],
    },
  ],
};
