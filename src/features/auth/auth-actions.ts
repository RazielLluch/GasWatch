"use server";

import {createClient} from "@/server/supabase/server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {signupSchema} from "@/lib/schemas";

export type SigninState = {
  success: boolean;
  message?: string;
  errorId?: number;
};

export async function signin(
  _prevState: SigninState,
  formData: FormData
): Promise<SigninState> {
  const supabase = await createClient();

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {

    if (error.status === 400) {
      return {
        success: false,
        message: error.message,
        errorId: (_prevState.errorId ?? 0) + 1,
      };
    }

    redirect(`/error?status=${error.status ?? 500}&message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {

  const supabase = await createClient();

  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password"),
    options: {
      data: {
        first_name: formData.get("first_name"),
        last_name: formData.get("last_name"),
      }
    }
  }

  console.log(rawData);

  const result = signupSchema.safeParse(rawData);

  if (!result.success){
    console.log(result.error);

    redirect(
      `/error?status=400&message=${encodeURIComponent("Invalid signup information.")}`
    );
  }

  const { confirm_password: _confirmPassword, ...signUpData } = result.data;
  const { error } = await supabase.auth.signUp(signUpData);

  if (error) {
    console.log(error);

    redirect(
      `/error?status=${error.status ?? 500}&message=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}