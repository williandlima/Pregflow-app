package com.williandlima.pregflow.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = PregFlowPrimary,
    onPrimary = PregFlowOnPrimaryLight,
    secondary = PregFlowSecondary,
    tertiary = PregFlowTertiary,
    background = PregFlowBackgroundLight,
    surface = PregFlowSurfaceLight,
)

private val DarkColors = darkColorScheme(
    primary = PregFlowPrimary,
    onPrimary = PregFlowOnPrimaryDark,
    secondary = PregFlowSecondary,
    tertiary = PregFlowTertiary,
    background = PregFlowBackgroundDark,
    surface = PregFlowSurfaceDark,
)

/**
 * Cor de marca fixa (não usa dynamic color do Material You) para manter a
 * identidade visual do PregFlow consistente em qualquer dispositivo/versão.
 */
@Composable
fun PregFlowTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colorScheme,
        typography = PregFlowTypography,
        content = content,
    )
}
