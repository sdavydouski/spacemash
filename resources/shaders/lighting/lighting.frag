#version 300 es

precision mediump float;

in vec2 uv;
in vec3 normal;
in vec3 fragmentPosition;
in vec3 lightPosition;

out vec4 finalColor;

struct Material {
    sampler2D diffuse;
    sampler2D specular;
    float shininess;
};

struct Light {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    // attenuation coefficients
    float constant;
    float linear;
    float quadratic;
};

uniform Material material;
uniform Light light;

void main() {
    vec3 diffuseColor = vec3(texture(material.diffuse, uv));
    vec3 specularIntensity = vec3(texture(material.specular, uv));

    float distance = length(lightPosition - fragmentPosition);
    float attenuation = 1.f / (light.constant + light.linear * distance + light.quadratic * distance * distance);

    // ambient
    vec3 ambient = light.ambient * diffuseColor;   // ambient is the same as diffuse

    // diffuse
    vec3 normal = normalize(normal);
    vec3 lightDirection = normalize(lightPosition - fragmentPosition);
    float diff = max(dot(normal, lightDirection), 0.f);
    vec3 diffuse = light.diffuse * diff * diffuseColor;

    // specular
    vec3 eyeDirection = normalize(-fragmentPosition);   // because all lighting calculations are done in view space
    vec3 reflectionDirection = reflect(-lightDirection, normal);
    float spec = pow(max(dot(eyeDirection, reflectionDirection), 0.f), material.shininess);
    vec3 specular = light.specular * spec * specularIntensity;

    vec3 result = (ambient + diffuse + specular) * attenuation;

    finalColor = vec4(result, 1.f);
}