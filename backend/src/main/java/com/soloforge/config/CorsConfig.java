package com.soloforge.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.Collections;

@Configuration
public class CorsConfig {

    @Bean
    public FilterRegistrationBean<CorsFilter> customCorsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Permite qualquer origem (Frontend Vercel, localhost, etc.)
        config.setAllowedOriginPatterns(Collections.singletonList("*"));
        
        // Permite todos os métodos HTTP usuais, especialmente DELETE e OPTIONS para preflights
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        
        // Permite todos os cabeçalhos da requisição
        config.setAllowedHeaders(Collections.singletonList("*"));
        
        // Permite envio de credenciais/cookies se necessário
        config.setAllowCredentials(true);
        
        // Cache preflight por 1 hora
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        FilterRegistrationBean<CorsFilter> bean = new FilterRegistrationBean<>(new CorsFilter(source));
        // Prioridade máxima para interceptar OPTIONS antes de qualquer filtro ou erro
        bean.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return bean;
    }
}
