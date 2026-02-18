package com.example.dazederp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * CORS 配置：允许微信小程序和其他前端跨域访问
 * 
 * 微信小程序的请求会从以下域名发起：
 * - https://servicewechat.com（正式环境）
 * - http://localhost:8080（开发环境，仅用于测试）
 */
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // 允许的源（域名）
        // 生产环境：只允许微信小程序域名
        // 开发环境：可以添加 localhost
        config.setAllowedOrigins(List.of(
            "https://servicewechat.com",  // 微信小程序正式环境
            "http://localhost:8080",      // 本地开发（网页前端）
            "http://127.0.0.1:8080",      // 本地开发（备用）
            "http://localhost:5173",      // Vite 开发服务器
            "http://127.0.0.1:5173"       // Vite 开发服务器（备用）
        ));
        
        // 允许的 HTTP 方法
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        
        // 允许的请求头
        config.setAllowedHeaders(Arrays.asList("*"));
        
        // 允许携带凭证（Cookie、Authorization header）
        config.setAllowCredentials(true);
        
        // 预检请求的缓存时间（秒）
        config.setMaxAge(3600L);
        
        // 暴露给前端的响应头（前端可以通过 response.headers 访问）
        config.setExposedHeaders(Arrays.asList("Authorization", "Content-Type"));
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
