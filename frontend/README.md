This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, you have to define some environment variables:
1. create a file ```.env.local``` in the **frontend** directory.
2. Add to it the following values:

    ```
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapboxgl_token
    NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8080/ 
    ```
A MapboxGL token can be obtained [here](https://docs.mapbox.com/help/getting-started/access-tokens/). The other value is the URL of your backend deployment. For developement, I suggest to leave it this way in order to connect to your local flask serverì.

3. Now you have to do "the same" for the backend (*if you want to start right off trough Vercel*): create a ```.env``` file in the **backend** folder, and write in it:

```
export BLOB_READ_WRITE_TOKEN="your_vercel_blob_token"
```

After you deployed your project on Vercel, you can infact connect it to a Blob storage. More information on how to do this [here](https://vercel.com/storage/blob).


Finally, you can run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy the application is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
