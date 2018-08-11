#version 300 es

precision mediump float;

in vec2 uv;
in vec3 fragmentPosition;
in vec3 lightPosition;
in mat3 TBN;

layout (location = 0) out vec4 fragmentColor;
layout (location = 1) out vec4 brightnessColor;

struct Material {
    sampler2D diffuse;
    sampler2D specular;
    sampler2D normal;
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
    vec3 diffuseColor = texture(material.diffuse, uv).rgb;
    vec3 specularIntensity = vec3(texture(material.specular, uv));

    float distance = length(lightPosition - fragmentPosition);
    float attenuation = 1.f / (light.constant + light.linear * distance + light.quadratic * distance * distance);

    // ambient
    vec3 ambient = light.ambient * diffuseColor;   // ambient is the same as diffuse

    // obtain normal from normal map in range [0, 1]
    vec3 normal = texture(material.normal, uv).rgb;
    // transform normal vector to range [-1, 1]
    normal = normalize(normal * 2.f - 1.f);
    normal = normalize(TBN * normal);

    // diffuse
    vec3 lightDirection = normalize(lightPosition - fragmentPosition);
    float diff = max(dot(normal, lightDirection), 0.f);
    vec3 diffuse = light.diffuse * diff * diffuseColor;

    // specular
    vec3 eyeDirection = normalize(-fragmentPosition);   // because all lighting calculations are done in view space

    // Phong shading model
//    vec3 reflectionDirection = reflect(-lightDirection, normal);
//    float spec = pow(max(dot(eyeDirection, reflectionDirection), 0.f), material.shininess);

    // Blinn-Phong shading model
    vec3 halfWayDirection = normalize(lightDirection + eyeDirection);
    float spec = pow(max(dot(halfWayDirection, normal), 0.f), material.shininess);

    vec3 specular = light.specular * spec * specularIntensity;

    vec3 result = (ambient + diffuse + specular) * attenuation;

    fragmentColor = vec4(result, 1.f);

    // check whether fragment output is higher than threshold, if so output as brightness color
    float brightness = dot(fragmentColor.rgb, vec3(0.2126f, 0.7152f, 0.0722f));
    brightnessColor = brightness > 1.f ?
        vec4(fragmentColor.rgb, 1.0f) :
        vec4(0.0f, 0.0f, 0.0f, 1.0f);
}