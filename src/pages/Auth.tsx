import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { formatErrorMessage } from "@/lib/error-handling";
import { LinkedinIcon, Loader2, AlertCircle } from "lucide-react";
import type { z } from "zod";

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      company: "",
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (data: SignInFormData) => {
    setIsLoading(true);
    
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        toast({
          title: "Sign in failed",
          description: formatErrorMessage(error),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: formatErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setIsLoading(true);
    
    try {
      const { error } = await signUp(data.email, data.password, {
        first_name: data.firstName,
        last_name: data.lastName,
        company: data.company,
      });
      
      if (error) {
        toast({
          title: "Sign up failed",
          description: formatErrorMessage(error),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created!",
          description: "You have successfully created your account.",
        });
      }
    } catch (error) {
      toast({
        title: "Sign up failed",
        description: formatErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-card-border">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <LinkedinIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground">LinkedAgent</h1>
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Form {...signInForm}>
                <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                  <FormField
                    control={signInForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@company.com"
                            autoComplete="email"
                            aria-describedby="signin-email-error"
                            className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          />
                        </FormControl>
                        <FormMessage id="signin-email-error" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signInForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            autoComplete="current-password"
                            aria-describedby="signin-password-error"
                            className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          />
                        </FormControl>
                        <FormMessage id="signin-password-error" />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full focus:ring-2 focus:ring-primary focus:ring-offset-2" 
                    variant="azure"
                    disabled={isLoading}
                    aria-describedby={isLoading ? "signin-loading" : undefined}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        <span id="signin-loading">Signing in...</span>
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="signup">
              <Form {...signUpForm}>
                <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signUpForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="John"
                              autoComplete="given-name"
                              aria-describedby="firstname-error"
                              className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            />
                          </FormControl>
                          <FormMessage id="firstname-error" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Doe"
                              autoComplete="family-name"
                              aria-describedby="lastname-error"
                              className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            />
                          </FormControl>
                          <FormMessage id="lastname-error" />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={signUpForm.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Acme Corp"
                            autoComplete="organization"
                            aria-describedby="company-error"
                            className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          />
                        </FormControl>
                        <FormMessage id="company-error" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            placeholder="you@company.com"
                            autoComplete="email"
                            aria-describedby="signup-email-error"
                            className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          />
                        </FormControl>
                        <FormMessage id="signup-email-error" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signUpForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="password"
                            autoComplete="new-password"
                            aria-describedby="signup-password-error signup-password-requirements"
                            className="focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          />
                        </FormControl>
                        <FormMessage id="signup-password-error" />
                        <p id="signup-password-requirements" className="text-xs text-muted-foreground mt-1">
                          Password must be at least 8 characters with uppercase, lowercase, and number
                        </p>
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full focus:ring-2 focus:ring-primary focus:ring-offset-2" 
                    variant="azure"
                    disabled={isLoading}
                    aria-describedby={isLoading ? "signup-loading" : undefined}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        <span id="signup-loading">Creating account...</span>
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;