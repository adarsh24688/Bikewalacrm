import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/leads/:path*",
    "/pipeline/:path*",
    "/inbox/:path*",
    "/quotations/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/follow-ups/:path*",
    "/dashboard/:path*",
  ],
};
