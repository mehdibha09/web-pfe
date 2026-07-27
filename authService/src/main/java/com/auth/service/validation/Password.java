package com.auth.service.validation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Target({ ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT })
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters")
@Pattern.List({
    @Pattern(regexp = ".*[A-Z].*", message = "Password must contain at least one uppercase letter"),
    @Pattern(regexp = ".*[a-z].*", message = "Password must contain at least one lowercase letter"),
    @Pattern(regexp = ".*\\d.*", message = "Password must contain at least one digit"),
    @Pattern(regexp = ".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*", message = "Password must contain at least one special character")
})
@Constraint(validatedBy = {})
public @interface Password {
    String message() default "Password must be 8-128 characters with uppercase, lowercase, digit, and special character";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}