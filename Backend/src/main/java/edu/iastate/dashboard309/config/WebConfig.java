package edu.iastate.dashboard309.config;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serves the React Native / Expo web build from Spring Boot's static folder.
 * Any request that doesn't match a real file falls back to index.html so that
 * client-side navigation works correctly (SPA routing).
 *
 * API routes (/api/**) are handled by Spring MVC controllers first and are
 * never intercepted by this handler.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(false)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource resource = location.createRelative(resourcePath);
                        return resource.exists() && resource.isReadable()
                                ? resource
                                : new ClassPathResource("/static/index.html");
                    }
                });
    }
}
