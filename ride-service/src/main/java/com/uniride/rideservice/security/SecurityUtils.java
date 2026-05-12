package com.uniride.rideservice.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class SecurityUtils {

    public static Long getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getDetails() == null) return null;
        Long[] details = (Long[]) auth.getDetails();
        return details[0];
    }

    public static Long getInstituicaoId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getDetails() == null) return null;
        Long[] details = (Long[]) auth.getDetails();
        return details.length > 1 ? details[1] : null;
    }
}
