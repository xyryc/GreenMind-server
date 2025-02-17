# GreenMind

GreenMind is an eCommerce platform for buying and selling plants, built with the MERN stack (MongoDB, Express.js, React.js, and Node.js). It includes three user roles: User, Seller, and Admin, each with specific permissions for managing plants and transactions.

## Live & Source Code

- [GreenMind Live](https://greenmind-ecommerce.web.app/)
- [GreenMind Client](https://github.com/xyryc/GreenMind-client)
- [GreenMind Server](https://github.com/xyryc/GreenMind-server)

## Test Credentials

For testing the platform, use the following credentials:

#### Admin Account

- **Email:** `admin@gmail.com`
- **Password:** `Admin@elite123`

#### Seller Account

- **Email:** `seller@gmail.com`,
- **Password:** `abc123`

#### Stripe Test Cards

- **Visa Card:** `4242424242424242`
- **Master Card:** `5555555555554444`
- **CVC:** `Any 3 digits`
- **Date:** `Any future date`

## **Features**

### **User/Buyer Role**

- Users/Buyers can **browse** through a variety of plants, view **details**, and place an order using the **Stripe** payment gateway.
- Users/Buyers can **track their orders** from the order page. Once the order is placed, the user will receive an order details email with the transaction ID. The seller will also receive an email notification to deliver the product.
- Orders can be **canceled** if the status is "**In Progress**" or "**Pending.**" Once the order is **delivered**, cancellation is not allowed.
- If an order is **canceled**, the order amount will be **refunded**, and stock levels will be **updated** accordingly.
- Users can **submit a request** to become a **seller** on the platform.
- Users can also **view and manage their profile** details.

### **Seller Role**

- Once promoted by the admin, the seller gains access to the **seller dashboard**.
- The seller can update or delete the plants they have added.
- Added plants will appear on the **plants page**, available for users to purchase.
- Seller can **update** or **delete** a plant his added plants.
- Seller can view orders on the **Manage Orders** page, where they can update the order status to **Pending**, **Start Processing**, or **Deliver**. Seller can also **cancel** an order if there is **no stock**.

### **Admin Role**

- Admin can manage users on the **Manage Users** page, with the ability to **promote** or **demote** users to **customer**, **seller**, or **admin**.
- Admin can view key metrics like **total revenue**, **total orders**, **total plants**, and **total users** on the **Statistics** page.

## **Tech Stack**

#### **Frontend:**

- **React.js**: For building user interfaces.
- **Tailwind CSS**: Utility-first CSS framework.
- **DaisyUI**: Elegant UI components.
- **HeadlessUI**: Elegant UI components.
- **React Router DOM**: Navigation and routing.
- **TanStack Query**: Data fetching and caching.
- **Firebase Authentication**: Secure user authentication.
- **React Helmet**: Manages document head for dynamic meta tags.
- **React Hot Toast**: Customizable toast notifications.
- **React Icons**: Customizable icons for React apps.
- **React Date Range**: Date range picker component.
- **React Spinners**: Loading spinners for visual feedback.
- **React Fast Marquee**: Smooth scrolling text and marquee effects.

#### **Backend:**

- **Node.js**: Server-side runtime.
- **Express.js**: RESTful APIs framework.
- **JWT**: Secure authentication.
- **Nodemailer**: Sending email notifications and transactional emails.

#### **Database:**

- **MongoDB**: NoSQL database for app data.

#### **Payment Integration:**

- **Stripe API**: Secure payment processing.

#### **Deployment:**

- **Firebase & Surge**: Frontend hosting.
- **Vercel**: Backend hosting.

#### **Other Tools:**

- **ImgBB**: Image management.
- **Git & GitHub**: Version control.
- **ESLint & Prettier**: Code quality tools.

## How to Run Locally

Follow these steps to set up and run the project locally:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/xyryc/GreenMind-client.git
   cd GreenMind-client
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Add Firebase configuration:**

   - Create a `.env.local` file in the root directory and add your Firebase config keys:

   ```bash
    VITE_apiKey=your_api_key
    VITE_authDomain=your_auth_domain
    VITE_projectId=your_project_id
    VITE_storageBucket=your_project_bucket
    VITE_messagingSenderId=your_messaging_sender_id
    VITE_appId=your_app_id
    VITE_IMGBB_API_KEY=your_imgbb_api_key
    VITE_STRIPE_PUBLIC_KEY=your_payment_gateway_public_key
    VITE_API_URL=your_backend_server_url
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
5. **Open the app in your browser:**
   ```bash
   http://localhost:5173/
   ```

## Contribution

Feel free to fork the repository, make improvements, and submit a pull request. For major changes, open an issue first to discuss the proposed changes.
